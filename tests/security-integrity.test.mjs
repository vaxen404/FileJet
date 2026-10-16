import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { stripTypeScriptTypes } from 'node:module'
import { Readable } from 'node:stream'
import test from 'node:test'

export async function load(path, bindings, result) {
    const source = await fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    const code = stripTypeScriptTypes(source).replace(/^import .+$/gm, '')
        .replace(/^export default /gm, 'const handler = ').replace(/^export /gm, '')
    return new Function(...Object.keys(bindings), `${code}\nreturn ${result}`)(...Object.values(bindings))
}

const owner = '10000000-0000-4000-8000-000000000000'
const part = { name: 'files', filename: 'hello.txt', data: Buffer.from('hello') }
const throwError = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }) }

test('exclusive-open collisions never unlink or overwrite the existing file', async () => {
    let removed = false
    const { saveFileToStorage } = await load('server/utils/files.ts', {
        randomUUID, resolve, dirname, sep, process, mkdir: async () => {},
        open: async () => { throw Object.assign(new Error('Exists'), { code: 'EEXIST' }) },
        unlink: async () => { removed = true }
    }, '({ saveFileToStorage })')
    await assert.rejects(saveFileToStorage(owner, part), { code: 'EEXIST' })
    assert.equal(removed, false)
})

test('partial write, sync and close failures close the owned handle and clean its file', async () => {
    for (const failure of ['writeFile', 'sync', 'close']) {
        let removed = 0, closed = 0
        const handle = {
            async writeFile() { if (failure === 'writeFile') throw new Error('write failed') },
            async sync() { if (failure === 'sync') throw new Error('sync failed') },
            async close() { closed++; if (failure === 'close' && closed === 1) throw new Error('close failed') }
        }
        const save = await load('server/utils/files.ts', {
            randomUUID, resolve, dirname, sep, process, mkdir: async () => {},
            open: async () => handle, unlink: async () => { removed++ }
        }, 'saveFileToStorage')
        await assert.rejects(save(owner, part), /failed/)
        assert.equal(removed, 1)
        assert.ok(closed >= 1)
    }
})

async function stagedFixture(t, options = {}) {
    const directory = await fs.mkdtemp(join(tmpdir(), 'filejet-integrity-'))
    t.after(async () => {
        assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep))
        await fs.rm(directory, { recursive: true, force: true })
    })
    const committed = new Set()
    const fileUtils = await load('server/utils/files.ts', {
        randomUUID, resolve, dirname, sep, process: { cwd: () => directory },
        mkdir: fs.mkdir, open: fs.open, unlink: fs.unlink
    }, '({ storagePath, saveFileToStorage })')
    let writes = 0, transactions = 0
    const stage = await load('server/utils/uploads.ts', {
        randomUUID, join, mkdir: fs.mkdir, open: fs.open, unlink: fs.unlink, rmdir: fs.rmdir,
        storagePath: fileUtils.storagePath,
        async saveFileToStorage(...args) {
            assert.equal(transactions, 0, 'No disk writes inside metadata transactions')
            writes++
            if (options.failWrite === writes) throw new Error('Disk full')
            return fileUtils.saveFileToStorage(...args)
        },
        prisma: { async $transaction(work) {
            if (options.databaseDown) throw new Error('Database unavailable')
            transactions++
            try { return await work({
                $queryRaw: async () => [],
                files: { findMany: async () => [...committed].map(storage_key => ({ storage_key })) }
            }) } finally { transactions-- }
        } }
    }, 'stageUpload')
    return { stage, committed, directory }
}

test('failure midway through a batch cleans earlier physical files and its journal', async t => {
    const f = await stagedFixture(t, { failWrite: 2 })
    await assert.rejects(f.stage(owner, [part, part]), /Disk full/)
    assert.deepEqual(await fs.readdir(join(f.directory, 'storage', owner)), [])
    assert.deepEqual(await fs.readdir(join(f.directory, 'storage', '.uploads')), [])
})

test('rollback preserves committed files after an ambiguous COMMIT result', async t => {
    const f = await stagedFixture(t)
    const batch = await f.stage(owner, [part, part])
    f.committed.add(batch.keys[0])
    await batch.rollback()
    assert.equal(await fs.readFile(join(f.directory, 'storage', batch.keys[0]), 'utf8'), 'hello')
    await assert.rejects(fs.stat(join(f.directory, 'storage', batch.keys[1])), { code: 'ENOENT' })
})

test('database outages retain content and a durable journal for offline recovery', async t => {
    const f = await stagedFixture(t, { databaseDown: true })
    const batch = await f.stage(owner, [part])
    await batch.rollback()
    assert.equal(await fs.readFile(join(f.directory, 'storage', batch.keys[0]), 'utf8'), 'hello')
    const journals = await fs.readdir(join(f.directory, 'storage', '.uploads'))
    assert.equal(journals.length, 1)
    const manifest = JSON.parse(await fs.readFile(join(f.directory, 'storage', '.uploads', journals[0]), 'utf8'))
    assert.deepEqual(manifest.keys, batch.keys)
})

async function runRecovery(directory, committed, offline = true, archived = new Set()) {
    const source = await fs.readFile(new URL('../maintenance/recover-uploads.mjs', import.meta.url), 'utf8')
    const code = source.replace(/^import .+$/gm, '')
    const bindings = {
        readdir: fs.readdir, readFile: fs.readFile, unlink: fs.unlink, rmdir: fs.rmdir, resolve, sep,
        process: { argv: offline ? ['--offline'] : [], cwd: () => directory, env: {} },
        console: { log() {} },
        pg: { Client: class {
            async connect() {}
            async end() {}
            async query(sql, params) {
                if (sql.includes('information_schema')) return { rows: [{ present: archived.size > 0 }] }
                const [keys] = params
                assert.ok(sql.includes('storage_key = ANY'))
                const references = sql.includes('FROM trash') ? archived : committed
                return { rows: keys.filter(key => references.has(key)).map(storage_key => ({ storage_key })) }
            }
        } }
    }
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    return new AsyncFunction(...Object.keys(bindings), code)(...Object.values(bindings))
}

test('offline recovery is repeatable and retains committed files after a crash', async t => {
    const f = await stagedFixture(t)
    const batch = await f.stage(owner, [part, part])
    f.committed.add(batch.keys[0])
    await runRecovery(f.directory, f.committed)
    await runRecovery(f.directory, f.committed)
    assert.equal(await fs.readFile(join(f.directory, 'storage', batch.keys[0]), 'utf8'), 'hello')
    await assert.rejects(fs.stat(join(f.directory, 'storage', batch.keys[1])), { code: 'ENOENT' })
    assert.deepEqual(await fs.readdir(join(f.directory, 'storage', '.uploads')), [])
})

test('recovery preserves content referenced by an existing archive table', async t => {
    const f = await stagedFixture(t)
    const batch = await f.stage(owner, [part])
    await runRecovery(f.directory, new Set(), true, new Set(batch.keys))
    assert.equal(await fs.readFile(join(f.directory, 'storage', batch.keys[0]), 'utf8'), 'hello')
})

test('recovery requires downtime acknowledgement and rejects corrupted paths without deleting content', async t => {
    const f = await stagedFixture(t)
    const batch = await f.stage(owner, [part])
    await assert.rejects(runRecovery(f.directory, f.committed, false), /Stop ALL/)
    const path = join(f.directory, 'storage', '.uploads', (await fs.readdir(join(f.directory, 'storage', '.uploads')))[0])
    const manifest = JSON.parse(await fs.readFile(path, 'utf8'))
    manifest.keys = ['../outside']
    await fs.writeFile(path, JSON.stringify(manifest))
    await assert.rejects(runRecovery(f.directory, f.committed), /Invalid upload journal/)
    assert.equal(await fs.readFile(join(f.directory, 'storage', batch.keys[0]), 'utf8'), 'hello')
})

test('favorites reject mixed-target rows and never select internal storage keys', async () => {
    let query
    const handler = await load('server/api/favorites/index.get.ts', {
        defineEventHandler: fn => fn, getAuthSession: () => ({ userId: owner }), throwError,
        prisma: { favorites: { async findMany(value) { query = value; return [] } } }
    }, 'handler')
    assert.deepEqual(await handler({}), { favorites: [] })
    assert.equal(query.where.user_id, owner)
    for (const branch of query.where.OR) {
        assert.equal(Object.values(branch).filter(value => value === null).length, 2)
        const relation = Object.values(branch).find(value => value && typeof value === 'object')
        assert.deepEqual(relation, { is: { user_id: owner } })
    }
    assert.equal(query.include.files.select.storage_key, undefined)
})

test('favorites cannot be created for another owner and concurrent checks run under the user lock', async () => {
    let locked = false, created = false
    const handler = await load('server/api/favorites/index.post.ts', {
        defineEventHandler: fn => fn, getAuthSession: () => ({ userId: owner }), throwError,
        enforceRateLimit() {}, isUuid: () => true, readBody: async () => ({ itemType: 'file', itemId: randomUUID() }),
        lockStorageUser: async () => { locked = true },
        prisma: { $transaction: async fn => fn({ files: { async findFirst({ where }) {
            assert.ok(locked); assert.equal(where.user_id, owner); return null
        } }, favorites: { create: async () => { created = true } } }) }
    }, 'handler')
    await assert.rejects(handler({}), { statusCode: 404 })
    assert.equal(created, false)
})

test('notes list converts BigInt sizes without losing precision', async () => {
    const size = 9007199254740993n
    const handler = await load('server/api/notes/index.get.ts', {
        defineEventHandler: fn => fn, getAuthSession: () => ({ userId: owner }),
        prisma: { notes: { findMany: async () => [{ size }] } }
    }, 'handler')
    assert.equal(JSON.stringify(await handler({})), `{"notes":[{"size":"${size}"}]}`)
})

test('archive supports long UTF-8 paths and rejects path traversal', async () => {
    const createTar = await load('server/utils/tar.ts', { Readable }, 'createTar')
    const path = 'klasör/' + 'ğ'.repeat(110) + '.txt'
    const chunks = []
    for await (const chunk of createTar([{ path, size: 5, content: Readable.from([Buffer.from('hello')]) }])) chunks.push(chunk)
    const archive = Buffer.concat(chunks)
    assert.equal(archive.length % 512, 0)
    assert.ok(archive.includes(Buffer.from(`path=${path}\n`)))
    const invalid = createTar([{ path: '../secret', size: 0, content: Readable.from([]) }])
    await assert.rejects(async () => { for await (const _ of invalid) {} }, /Invalid archive path/)
})

test('new rename, note update and folder download endpoints reject anonymous and foreign access', async () => {
    for (const path of ['folders/[folderId].patch.ts', 'notes/[noteId].patch.ts', 'folders/[folderId]/download.get.ts']) {
        for (const anonymous of [true, false]) {
            let queried = false
            const findFirst = async ({ where }) => {
                queried = true
                assert.equal(where.user_id, owner)
                return null
            }
            const tx = { folders: { findFirst }, notes: { findFirst } }
            const handler = await load(`server/api/${path}`, {
                defineEventHandler: fn => fn, getAuthSession: () => anonymous ? null : { userId: owner },
                throwError, enforceRateLimit() {}, getRouterParam: () => randomUUID(), isUuid: () => true,
                readBody: async () => ({ newName: 'new', title: 'title', content: 'note' }),
                lockStorageUser: async () => {}, noteSchema: { safeParse: data => ({ success: true, data }) },
                prisma: { ...tx, $transaction: async fn => fn(tx) }
            }, 'handler')
            await assert.rejects(handler({}), { statusCode: anonymous ? 401 : 404 })
            assert.equal(queried, !anonymous)
        }
    }
})

test('note update reserves only the size delta and returns a JSON-safe owned note', async () => {
    const id = randomUUID(), deltas = []
    let reads = 0
    const handler = await load('server/api/notes/[noteId].patch.ts', {
        defineEventHandler: fn => fn, getAuthSession: () => ({ userId: owner }),
        throwError, enforceRateLimit() {}, getRouterParam: () => id, isUuid: () => true,
        readBody: async () => ({ title: 'new', content: 'öğ' }),
        noteSchema: { safeParse: data => ({ success: true, data }) },
        lockStorageUser: async () => {}, reserveStorage: async (_, userId, size) => { assert.equal(userId, owner); deltas.push(size) },
        prisma: { $transaction: async fn => fn({ notes: {
            async findFirst() { return reads++ === 0 ? { size: 2n, folder_id: null } : null },
            async update({ where, data }) { assert.deepEqual(where, { id, user_id: owner }); return { id, ...data } }
        } }) }
    }, 'handler')
    const response = await handler({})
    assert.deepEqual(deltas, [2n])
    assert.equal(response.note.size, '4')
    assert.doesNotThrow(() => JSON.stringify(response))
})
