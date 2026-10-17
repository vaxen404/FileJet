import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname, join, sep } from 'node:path'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import * as h3 from 'h3'
import argon2 from 'argon2'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')
const apiRoutes = readdirSync(resolve(root, 'server/api'), { recursive: true })
    .map(file => file.replaceAll('\\', '/')).sort()
    .flatMap(file => {
        const match = file.match(/^(.*)\.(get|post|patch|delete|head)\.ts$/)
        return match ? [{
            source: `server/api/${file}`, method: match[2],
            path: `/api/${match[1]}`.replace(/\/index$/, '').replace(/\[([^/]+)\]/g, ':$1')
        }] : []
    })
process.env.AUTH_SECRET = 'filejet-test-secret-only-not-a-real-credential-12345'

function fixture(options = {}) {
    const owner = randomUUID()
    const fileId = randomUUID()
    const token = randomUUID()
    const record = {
        id: randomUUID(), user_id: owner, item_id: fileId, item_type: 'file', token,
        password_hash: null, expires_at: null, access_version: randomUUID(), users: { username: 'Owner' }
    }
    const file = { id: fileId, user_id: owner, name: 'private.mp4', original_name: 'private.mp4', size: 42n, mime_type: 'video/mp4', storage_key: 'never-read-before-authorization', technical_metadata: null, metadata_checked_at: null, metadata_signature: null }
    const rows = [record]
    const fileQueries = []
    const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => row[key] === value)
    const db = {
        shared_items: {
            findUnique: async ({ where }) => rows.find(row => matches(row, where)) ?? null,
            findFirst: async ({ where }) => rows.find(row => matches(row, where)) ?? null,
            count: async () => rows.length,
            create: async ({ data }) => {
                const row = { id: randomUUID(), password_hash: null, expires_at: null, access_version: randomUUID(), ...data }
                rows.push(row)
                return row
            },
            update: async ({ where, data }) => {
                const row = rows.find(row => matches(row, where))
                Object.assign(row, data)
                return row
            },
            updateMany: async ({ where, data }) => {
                const found = rows.filter(row => matches(row, where))
                found.forEach(row => Object.assign(row, data))
                return { count: found.length }
            },
            deleteMany: async ({ where }) => {
                const found = rows.filter(row => matches(row, where))
                found.forEach(row => rows.splice(rows.indexOf(row), 1))
                return { count: found.length }
            }
        },
        files: {
            findFirst: async ({ where, select }) => {
                fileQueries.push({ where, select })
                if (!matches(file, where)) return null
                return select ? Object.fromEntries(Object.keys(select).filter(key => select[key] === true).map(key => [key, file[key]])) : file
            },
            updateMany: async ({ where, data }) => {
                if (!matches(file, where)) return { count: 0 }
                Object.assign(file, data)
                return { count: 1 }
            }
        },
        folders: { findFirst: async () => null }, notes: { findFirst: async () => null },
        $transaction: async work => work(db)
    }
    const cache = new Map()
    function load(path) {
        const filename = resolve(root, path)
        if (cache.has(filename)) return cache.get(filename).exports
        const module = { exports: {} }
        cache.set(filename, module)
        const src = readFileSync(filename, 'utf8')
        const compiled = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
        const localRequire = specifier => {
            if (specifier === 'node:child_process' && options.probe) {
                const execFile = () => {}
                execFile[Symbol.for('nodejs.util.promisify.custom')] = options.probe
                return { execFile }
            }
            const path = specifier.startsWith('~~/') ? resolve(root, specifier.slice(3))
                : specifier.startsWith('.') ? resolve(dirname(filename), specifier) : null
            if (!path) return require(specifier)
            if (path.endsWith('/prisma') || path.endsWith('\\prisma')) return { prisma: db }
            if (path.endsWith('/auth') || path.endsWith('\\auth')) return { getAuthSession: event => {
                const userId = h3.getHeader(event, 'x-test-owner')
                return userId ? { userId } : null
            } }
            return load(path.endsWith('.ts') ? path : `${path}.ts`)
        }
        const globals = {
            defineEventHandler: h3.defineEventHandler, getRouterParam: h3.getRouterParam,
            getRequestURL: h3.getRequestURL, getQuery: h3.getQuery, readBody: h3.readBody,
            createError: h3.createError, setHeader: h3.setHeader, getHeader: h3.getHeader,
            getRequestIP: h3.getRequestIP, setResponseHeader: h3.setResponseHeader,
            getMethod: h3.getMethod,
            setResponseStatus: h3.setResponseStatus, setResponseHeaders: h3.setResponseHeaders,
            sendStream: h3.sendStream,
            enforceRateLimit: (...args) => load('server/utils/rateLimit.ts').enforceRateLimit(...args)
        }
        new Function('require', 'module', 'exports', ...Object.keys(globals), compiled)(localRequire, module, module.exports, ...Object.values(globals))
        return module.exports
    }
    const app = h3.createApp({ debug: false })
    const router = h3.createRouter({ preemptive: true })
    for (const route of apiRoutes) {
        router.add(route.path, h3.defineEventHandler(event => load(route.source).default(event)), route.method)
    }
    app.use(router.handler)
    async function request(endpoint, { body, cookie, asOwner = false, token: requestToken = token, itemId = fileId, method = body === undefined ? 'GET' : 'POST', origin, range } = {}) {
        const route = apiRoutes.find(route => route.source === endpoint)
        assert.ok(route, `No API route for ${endpoint}`)
        const params = { token: requestToken, itemId, fileId: itemId, itemType: 'file' }
        const pathname = route.path.replace(/:(\w+)/g, (_, name) => encodeURIComponent(params[name]))
        const headers = { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}), ...(asOwner ? { 'x-test-owner': owner } : {}), ...(origin ? { origin } : {}), ...(range ? { range } : {}) }
        return h3.toWebHandler(app)(new Request(`http://localhost${pathname}?itemId=${itemId}&itemType=file`, {
            method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) })
        }))
    }
    return { owner, fileId, token, record, rows, file, fileQueries, load, request }
}

async function withStoredFile(f, work) {
    const storageRoot = resolve(root, 'storage')
    const directory = resolve(storageRoot, f.owner)
    assert.ok(directory.startsWith(storageRoot + sep))
    await mkdir(directory, { recursive: true })
    f.file.storage_key = `${f.owner}/${f.fileId}`
    const path = join(directory, f.fileId)
    await writeFile(path, '0123456789abcdef')
    try { await work(path) } finally {
        assert.ok(resolve(directory).startsWith(storageRoot + sep))
        await rm(directory, { recursive: true, force: true })
    }
}

const publicEndpoints = [
    'server/api/shared/[token]/index.get.ts',
    'server/api/shared/[token]/preview.get.ts',
    'server/api/shared/[token]/download.get.ts'
]
const unlock = 'server/api/shared/[token]/unlock.post.ts'
const patch = 'server/api/shared/items/[itemType]/[itemId].patch.ts'

test('public link routes coexist with owner settings and removal without losing token parameters', async () => {
    const f = fixture()
    const response = await f.request(publicEndpoints[0])
    assert.equal(response.status, 200)
    assert.equal((await response.json()).item.id, f.fileId)
    const updated = await f.request(patch, { asOwner: true, method: 'PATCH', body: { expiresAt: null } })
    assert.equal(updated.status, 200)
    assert.equal((await updated.json()).url, `http://localhost/shared/${f.token}`)
    assert.equal((await f.request(publicEndpoints[0])).status, 200)
    const removed = await f.request('server/api/shared/items/[itemType]/[itemId].delete.ts', { asOwner: true, method: 'DELETE' })
    assert.equal(removed.status, 200)
    assert.equal((await removed.json()).success, true)
    assert.equal((await f.request(publicEndpoints[0])).status, 404)
})

test('password screen receives only the filename; protected metadata and streams remain inaccessible', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Strong-password-1')
    for (const endpoint of publicEndpoints) {
        const response = await f.request(endpoint)
        assert.equal(response.status, 401, endpoint)
        assert.equal(response.headers.get('cache-control'), 'no-store')
        const body = await response.json()
        assert.ok(!JSON.stringify(body).includes(f.record.password_hash))
        if (endpoint === publicEndpoints[0]) {
            assert.deepEqual(body.data, { passwordRequired: true, fileName: 'private.mp4' })
        } else assert.ok(!JSON.stringify(body).includes('private.mp4'))
    }
    assert.deepEqual(f.fileQueries, [{ where: { id: f.fileId, user_id: f.owner }, select: { name: true, original_name: true } }])
})

test('incorrect passwords never grant access; a correct password grants metadata, preview and download access', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Correct-password-123')
    await withStoredFile(f, async () => {
        const rejected = await f.request(unlock, { body: { password: 'wrong-password' } })
        assert.equal(rejected.status, 401)
        assert.equal((await rejected.json()).statusMessage, 'Incorrect password. Please try again.')
        assert.equal(rejected.headers.get('set-cookie'), null)
        for (const endpoint of publicEndpoints) assert.equal((await f.request(endpoint)).status, 401)
        const granted = await f.request(unlock, { body: { password: 'Correct-password-123' } })
        assert.equal(granted.status, 200)
        const header = granted.headers.get('set-cookie')
        assert.match(header, /HttpOnly/i)
        assert.match(header, /SameSite=Lax/i)
        assert.ok(Number(header.match(/Max-Age=(\d+)/i)[1]) <= 3600)
        assert.ok(!header.includes('Correct-password-123'))
        const cookie = header.split(';')[0]
        for (const endpoint of publicEndpoints) {
            const response = await f.request(endpoint, { cookie })
            assert.equal(response.status, 200, endpoint)
            await response.text()
        }
    })
})

test('owners open their file, preview and download through account endpoints without a share password', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Owner-password-123')
    f.record.expires_at = new Date(Date.now() - 1000)
    await withStoredFile(f, async () => {
        for (const endpoint of ['index.get.ts', 'preview.get.ts', 'download.get.ts']) {
            const path = `server/api/files/[fileId]/${endpoint}`
            assert.equal((await f.request(path)).status, 401)
            const response = await f.request(path, { asOwner: true })
            assert.equal(response.status, 200, endpoint)
            await response.text()
        }
    })
})

test('expired links reject every resource even when a valid password grant exists', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Strong-password-2')
    const granted = await f.request(unlock, { body: { password: 'Strong-password-2' } })
    assert.equal(granted.status, 200)
    const cookie = granted.headers.get('set-cookie').split(';')[0]
    f.record.expires_at = new Date(Date.now() - 1)
    for (const endpoint of publicEndpoints) assert.equal((await f.request(endpoint, { cookie })).status, 410)
    assert.equal((await f.request(unlock, { body: { password: 'Strong-password-2' } })).status, 410)
})

test('password changes retain the URL, invalidate previous grants, and removing protection restores public access', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('First-password-1')
    const granted = await f.request(unlock, { body: { password: 'First-password-1' } })
    assert.equal(granted.status, 200)
    assert.match(granted.headers.get('set-cookie'), /HttpOnly/i)
    assert.match(granted.headers.get('set-cookie'), /SameSite=Lax/i)
    assert.match(granted.headers.get('set-cookie'), /Path=\//i)
    const cookie = granted.headers.get('set-cookie').split(';')[0]
    assert.equal((await f.request(publicEndpoints[0], { cookie })).status, 200)
    const version = f.record.access_version
    const changed = await f.request(patch, { asOwner: true, method: 'PATCH', body: { passwordAction: 'set', password: 'Second-password-2' } })
    assert.equal(changed.status, 200)
    const state = await changed.json()
    assert.equal(state.url, `http://localhost/shared/${f.token}`)
    assert.equal(state.hasPassword, true)
    assert.notEqual(f.record.access_version, version)
    assert.match(f.record.password_hash, /^\$argon2id\$/)
    assert.ok(!JSON.stringify(state).includes('password_hash'))
    assert.equal((await f.request(publicEndpoints[0], { cookie })).status, 401)
    assert.equal((await f.request(unlock, { body: { password: 'First-password-1' } })).status, 401)
    const next = await f.request(unlock, { body: { password: 'Second-password-2' } })
    assert.equal(next.status, 200)
    const nextGrant = next.headers.get('set-cookie').split(';')[0].split('=')[1]
    const { validShareGrant } = f.load('server/utils/shareSecurity.ts')
    assert.equal(validShareGrant(decodeURIComponent(nextGrant), f.record), true)
    const removed = await f.request(patch, { asOwner: true, method: 'PATCH', body: { passwordAction: 'remove' } })
    assert.equal(removed.status, 200)
    assert.equal(f.record.password_hash, null)
    assert.equal(validShareGrant(decodeURIComponent(nextGrant), f.record), false)
    assert.equal((await f.request(publicEndpoints[0])).status, 200)
})

test('settings require ownership and reject cross-origin requests, invalid passwords and past expiration', async () => {
    const f = fixture()
    assert.equal((await f.request(patch, { method: 'PATCH', body: { passwordAction: 'remove' } })).status, 401)
    assert.equal((await f.request(patch, { asOwner: true, itemId: randomUUID(), method: 'PATCH', body: {} })).status, 404)
    assert.equal((await f.request(patch, { asOwner: true, method: 'PATCH', origin: 'https://evil.example', body: {} })).status, 403)
    for (const body of [{ passwordAction: 'set', password: 'abc' }, { passwordAction: 'set' }, { expiresAt: 'not-a-date' }, { expiresAt: '2000-01-01T00:00:00.000Z' }]) {
        assert.equal((await f.request(patch, { asOwner: true, method: 'PATCH', body })).status, 400)
    }
    assert.equal(f.record.password_hash, null)
    assert.equal(f.record.expires_at, null)
    const accepted = await f.request(patch, { asOwner: true, method: 'PATCH', body: { passwordAction: 'set', password: 'abcd' } })
    assert.equal(accepted.status, 200)
    assert.equal(await argon2.verify(f.record.password_hash, 'abcd'), true)
    assert.equal((await f.request(unlock, { body: { password: 'abcd' } })).status, 200)
})

test('password verification is rate-limited independently from metadata access', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Correct-password')
    for (let i = 0; i < 5; i++) assert.equal((await f.request(unlock, { body: { password: 'wrong' } })).status, 401)
    const limited = await f.request(unlock, { body: { password: 'Correct-password' } })
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) > 0)
})

test('legacy links retain their URL and do not require a password; new settings are atomic on creation', async () => {
    const f = fixture()
    const originalVersion = f.record.access_version
    const endpoint = 'server/api/shared/index.post.ts'
    const legacy = await f.request(endpoint, { asOwner: true, body: { itemId: f.fileId, itemType: 'file' } })
    assert.equal(legacy.status, 200)
    assert.equal((await legacy.json()).url, `http://localhost/shared/${f.token}`)
    assert.equal(f.record.access_version, originalVersion)
    f.rows.length = 0
    const created = await f.request(endpoint, { asOwner: true, body: {
        itemId: f.fileId, itemType: 'file', passwordAction: 'set', password: 'Create-protected-1', expiresAt: new Date(Date.now() + 86400000).toISOString()
    } })
    assert.equal(created.status, 200)
    assert.equal((await created.json()).hasPassword, true)
    assert.equal(f.rows.length, 1)
    assert.match(f.rows[0].password_hash, /^\$argon2id\$/)
    assert.ok(f.rows[0].expires_at instanceof Date)
    assert.equal((await f.request(publicEndpoints[0], { token: f.rows[0].token })).status, 401)
})

test('grants are signed, time-limited and scoped to both the token and access revision', () => {
    const f = fixture()
    const { createShareGrant, validShareGrant } = f.load('server/utils/shareSecurity.ts')
    const grant = createShareGrant(f.record, 1000000)
    assert.equal(validShareGrant(grant, f.record, 1000001), true)
    assert.equal(validShareGrant(`${grant}x`, f.record, 1000001), false)
    assert.equal(validShareGrant(grant, { ...f.record, token: randomUUID() }, 1000001), false)
    assert.equal(validShareGrant(grant, { ...f.record, access_version: randomUUID() }, 1000001), false)
    assert.equal(validShareGrant(grant, f.record, 1000000 + 3600001), false)
})

test('share request bodies are bounded before password hashing', async () => {
    const f = fixture()
    const response = await f.request(patch, { asOwner: true, method: 'PATCH', body: { passwordAction: 'set', password: 'x'.repeat(10000) } })
    assert.equal(response.status, 413)
    assert.equal(f.record.password_hash, null)
})

test('ffprobe fields are normalized without estimating missing values', () => {
    const f = fixture()
    const { parseProbeMetadata } = f.load('server/utils/fileMetadata.ts')
    const data = parseProbeMetadata({ streams: [
        { codec_type: 'video', codec_name: 'mjpeg', width: 1, height: 1, disposition: { attached_pic: 1 } },
        { codec_type: 'video', codec_name: 'h264', width: 576, height: 1024, avg_frame_rate: '30000/1001' },
        { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '44100' }
    ], format: { duration: '15.5', bit_rate: '1200000', format_name: 'mov,mp4' } })
    assert.equal(data.width, 576)
    assert.equal(data.duration, 15.5)
    assert.equal(data.fps, 30000 / 1001)
    assert.deepEqual(Object.keys(data).sort(), ['duration', 'format', 'fps', 'height', 'width'])
    assert.deepEqual(parseProbeMetadata({ streams: [{ codec_type: 'video', width: -10, avg_frame_rate: '0/0' }], format: { duration: 'N/A' } }), {})
    assert.deepEqual(parseProbeMetadata(null), {})
})

test('authorized preview ranges and downloads still stream correctly behind password protection', async () => {
    const f = fixture()
    f.record.password_hash = await argon2.hash('Streaming-password')
    await withStoredFile(f, async () => {
        const response = await f.request(unlock, { body: { password: 'Streaming-password' } })
        const cookie = response.headers.get('set-cookie').split(';')[0]
        const preview = await f.request(publicEndpoints[1], { cookie })
        assert.equal(preview.status, 200)
        assert.equal(preview.headers.get('content-type'), 'video/mp4')
        assert.equal(await preview.text(), '0123456789abcdef')
        const partial = await f.request(publicEndpoints[1], { cookie, range: 'bytes=3-7' })
        assert.equal(partial.status, 206)
        assert.equal(partial.headers.get('content-range'), 'bytes 3-7/16')
        assert.equal(await partial.text(), '34567')
        assert.equal((await f.request(publicEndpoints[1], { cookie, range: 'bytes=100-200' })).status, 416)
        f.file.name = 'Renamed'
        f.file.original_name = 'Renamed.mp4'
        const download = await f.request(publicEndpoints[2], { cookie })
        assert.equal(download.status, 200)
        assert.match(download.headers.get('content-disposition'), /attachment/)
        assert.match(download.headers.get('content-disposition'), /Renamed\.mp4/)
        assert.equal(await download.text(), '0123456789abcdef')
    })
})

test('technical metadata is cached by the stored file signature and extraction uses bounded local-only arguments', async () => {
    let calls = 0
    const f = fixture({ probe: async (binary, args, options) => {
        calls++
        assert.equal(args[args.indexOf('-protocol_whitelist') + 1], 'file')
        assert.ok(args.includes('-format_whitelist'))
        assert.ok(!/codec_name|bit_rate|sample_rate|channels/.test(args[args.indexOf('-show_entries') + 1]))
        assert.equal(options.timeout, 8000)
        assert.equal(options.maxBuffer, 256 * 1024)
        assert.equal(options.windowsHide, true)
        return { stdout: JSON.stringify({ streams: [{ codec_type: 'video', width: 1280, height: 720 }], format: { duration: '20' } }) }
    } })
    await withStoredFile(f, async path => {
        const { getFileMetadata } = f.load('server/utils/fileMetadata.ts')
        assert.equal((await getFileMetadata(f.file)).width, 1280)
        assert.ok(f.file.metadata_checked_at instanceof Date)
        assert.equal((await getFileMetadata(f.file)).duration, 20)
        assert.equal(calls, 1)
        await writeFile(path, 'new longer stored file content')
        await getFileMetadata(f.file)
        assert.equal(calls, 2)
        const hostile = { ...f.file, id: randomUUID(), storage_key: `${f.owner}/../../outside` }
        assert.deepEqual(await getFileMetadata(hostile), {})
        assert.equal(calls, 2)
    })
})

test('file detail metadata and share status remain owner-only and never expose the stored password hash', async () => {
    const f = fixture()
    f.record.password_hash = 'private-hash-must-not-be-returned'
    const endpoint = 'server/api/files/[fileId]/index.get.ts'
    assert.equal((await f.request(endpoint)).status, 401)
    assert.equal((await f.request(endpoint, { asOwner: true, itemId: randomUUID() })).status, 404)
    const response = await f.request(endpoint, { asOwner: true })
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(result.share.hasPassword, true)
    assert.equal(result.share.url, `http://localhost/shared/${f.token}`)
    assert.ok(!JSON.stringify(result).includes(f.record.password_hash))
    f.file.folder_id = randomUUID()
    f.file.folders = { id: f.file.folder_id, name: 'Other-owner-private-folder', user_id: randomUUID() }
    const sanitized = await (await f.request(endpoint, { asOwner: true })).json()
    assert.equal(sanitized.folders, null)
    assert.ok(!JSON.stringify(sanitized).includes('Other-owner-private-folder'))
})

test('missing ffprobe is negatively cached and never prevents the owner from opening a file', async () => {
    let calls = 0
    const f = fixture({ probe: async () => { calls++; throw new Error('ENOENT') } })
    await withStoredFile(f, async () => {
        const { getFileMetadata } = f.load('server/utils/fileMetadata.ts')
        assert.deepEqual(await getFileMetadata(f.file), {})
        assert.deepEqual(await getFileMetadata(f.file), {})
        assert.equal(calls, 1)
        f.file.metadata_checked_at = new Date(Date.now() - 3600001)
        await getFileMetadata(f.file)
        assert.equal(calls, 2)
    })
})
