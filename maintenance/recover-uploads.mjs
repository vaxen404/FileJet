import 'dotenv/config'
import { readdir, readFile, unlink, rmdir } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import pg from 'pg'

// Explicit downtime is required: age alone cannot distinguish a crashed upload
// from an active upload on another instance using the same storage.
if (!process.argv.includes('--offline')) {
    throw new Error('Stop ALL FileJet instances/workers, then run with --offline.')
}
const root = resolve(process.cwd(), 'storage')
const journals = resolve(root, '.uploads')
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const validKey = new RegExp(`^${uuid}/${uuid}/${uuid}$`, 'i')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
    const names = await readdir(journals).catch(error => {
        if (error.code === 'ENOENT') return []
        throw error
    })
    for (const name of names) {
        if (!new RegExp(`^${uuid}\\.json$`, 'i').test(name)) continue
        const journalPath = resolve(journals, name)
        const journal = JSON.parse(await readFile(journalPath, 'utf8'))
        if (journal.version !== 1 || !Array.isArray(journal.keys) || !journal.keys.length
            || journal.directoryKey !== `${journal.userId}/${name.slice(0, -5)}`
            || journal.keys.some(key => typeof key !== 'string' || !validKey.test(key)
                || !key.startsWith(`${journal.directoryKey}/`))) {
            throw new Error(`Invalid upload journal: ${name}`)
        }
        // Check all owners: even corrupted metadata must not cause content loss.
        const { rows } = await client.query('SELECT storage_key FROM files WHERE storage_key = ANY($1::text[])', [journal.keys])
        const archive = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'trash' AND column_name = 'storage_key') AS present`)
        if (archive.rows[0]?.present) {
            rows.push(...(await client.query('SELECT storage_key FROM trash WHERE storage_key = ANY($1::text[])', [journal.keys])).rows)
        }
        const committed = new Set(rows.map(row => row.storage_key))
        for (const key of journal.keys) {
            if (committed.has(key)) continue
            const path = resolve(root, key)
            if (!path.startsWith(root + sep)) throw new Error('Invalid storage path.')
            await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error })
        }
        if (!committed.size) await rmdir(resolve(root, journal.directoryKey)).catch(error => {
            if (error.code !== 'ENOENT') throw error
        })
        await unlink(journalPath)
        console.log(`Recovered ${name}: retained ${committed.size} committed files.`)
    }
} finally {
    await client.end()
}
