import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { stripTypeScriptTypes } from 'node:module'
import pg from 'pg'
import test from 'node:test'

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
const allowed = connectionString && (process.env.TEST_DATABASE_URL
    || ['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname))

test('PostgreSQL concurrency and integrity in an isolated schema', { skip: !allowed }, async t => {
    const schema = `filejet_test_${randomUUID().replaceAll('-', '')}`
    assert.match(schema, /^filejet_test_[a-f0-9]+$/)
    const pool = new pg.Pool({ connectionString, max: 12, connectionTimeoutMillis: 3000 })
    const admin = await pool.connect()
    t.after(async () => {
        try { await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`) }
        finally { admin.release(); await pool.end() }
    })
    await admin.query(`CREATE SCHEMA ${schema}`)
    await admin.query(`SET search_path TO ${schema}`)
    await admin.query(`
        CREATE TABLE users (id uuid PRIMARY KEY, storage_used bigint, storage_limit bigint);
        CREATE TABLE folders (id uuid PRIMARY KEY, user_id uuid, parent_folder_id uuid, name text);
        CREATE TABLE favorites (id uuid PRIMARY KEY, user_id uuid, file_id uuid, folder_id uuid, note_id uuid);
    `)
    const migration = await readFile(new URL('../prisma/migrations/202610160001_integrity/migration.sql', import.meta.url), 'utf8')
    await admin.query(migration)
    const source = await readFile(new URL('../server/utils/storage.ts', import.meta.url), 'utf8')
    const code = stripTypeScriptTypes(source).replace(/^import .+$/gm, '').replace(/^export /gm, '')
    const { reserveStorage, lockStorageUser } = new Function('throwError', `${code}; return {reserveStorage, lockStorageUser}`)(
        (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }) }
    )
    const userId = randomUUID()
    await admin.query('INSERT INTO users VALUES ($1, 0, 100)', [userId])

    async function transaction(work) {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            await client.query(`SET LOCAL search_path TO ${schema}`)
            const tx = {
                async $queryRaw(strings, ...values) {
                    const sql = strings.reduce((text, part, i) => text + (i ? `$${i}` : '') + part, '')
                    const { rows } = await client.query(sql, values)
                    return rows.map(row => ({ ...row,
                        ...(row.storage_used != null && { storage_used: BigInt(row.storage_used) }),
                        ...(row.storage_limit != null && { storage_limit: BigInt(row.storage_limit) })
                    }))
                },
                users: { update: ({ where, data }) => client.query('UPDATE users SET storage_used=$1 WHERE id=$2', [data.storage_used, where.id]) }
            }
            const result = await work(tx, client)
            await client.query('COMMIT')
            return result
        } catch (error) { await client.query('ROLLBACK'); throw error }
        finally { client.release() }
    }

    await t.test('parallel uploads cannot oversubscribe quota or lose increments', async () => {
        const results = await Promise.allSettled(Array.from({ length: 20 }, () =>
            transaction(tx => reserveStorage(tx, userId, 20n))))
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 5)
        const rejected = results.filter(result => result.status === 'rejected')
        assert.ok(rejected.every(result => result.reason.statusCode === 400))
        assert.equal((await admin.query('SELECT storage_used FROM users WHERE id=$1', [userId])).rows[0].storage_used, '100')
    })

    await t.test('metadata failures roll back the quota reservation', async () => {
        await admin.query('UPDATE users SET storage_used=0 WHERE id=$1', [userId])
        await assert.rejects(transaction(async tx => {
            await reserveStorage(tx, userId, 40n)
            throw new Error('Metadata failure')
        }), /Metadata failure/)
        assert.equal((await admin.query('SELECT storage_used FROM users WHERE id=$1', [userId])).rows[0].storage_used, '0')
    })

    await t.test('concurrent folder find/create yields one shared folder', async () => {
        const ids = await Promise.all(Array.from({ length: 12 }, () => transaction(async (tx, client) => {
            await lockStorageUser(tx, userId)
            const existing = await client.query('SELECT id FROM folders WHERE user_id=$1 AND parent_folder_id IS NULL AND name=$2', [userId, 'shared'])
            if (existing.rows[0]) return existing.rows[0].id
            const id = randomUUID()
            await client.query('INSERT INTO folders VALUES ($1,$2,NULL,$3)', [id, userId, 'shared'])
            return id
        })))
        assert.equal(new Set(ids).size, 1)
        await assert.rejects(admin.query('INSERT INTO folders VALUES ($1,$2,NULL,$3)', [randomUUID(), userId, 'shared']), { code: '23505' })
    })

    await t.test('migration enforces child folder and favorite uniqueness and single-target favorites', async () => {
        const parent = randomUUID()
        await admin.query('INSERT INTO folders VALUES ($1,$2,$3,$4)', [randomUUID(), userId, parent, 'child'])
        await assert.rejects(admin.query('INSERT INTO folders VALUES ($1,$2,$3,$4)', [randomUUID(), userId, parent, 'child']), { code: '23505' })
        const fileId = randomUUID()
        await admin.query('INSERT INTO favorites VALUES ($1,$2,$3,NULL,NULL)', [randomUUID(), userId, fileId])
        await assert.rejects(admin.query('INSERT INTO favorites VALUES ($1,$2,$3,NULL,NULL)', [randomUUID(), userId, fileId]), { code: '23505' })
        await assert.rejects(admin.query('INSERT INTO favorites VALUES ($1,$2,$3,$4,NULL)', [randomUUID(), userId, randomUUID(), randomUUID()]), { code: '23514' })
    })
})
