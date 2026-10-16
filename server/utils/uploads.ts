import { randomUUID } from 'node:crypto'
import { mkdir, open, unlink, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from './prisma'
import type { Prisma } from '~~/src/generated/prisma/client'
import { storagePath, saveFileToStorage, type FilePart } from './files'

// Intent is durable before content is written. Recovery runs with all writers
// stopped, so it cannot race an upload running on another server instance.
export async function stageUpload(userId: string, files: FilePart[]) {
    const batchId = randomUUID()
    const directoryKey = `${userId}/${batchId}`
    await mkdir(storagePath(userId), { recursive: true })
    await mkdir(storagePath(directoryKey)) // Exclusive ownership of this directory.
    const keys = files.map(() => `${directoryKey}/${randomUUID()}`)
    const journalDirectory = storagePath('.uploads')
    await mkdir(journalDirectory, { recursive: true })
    const journalPath = join(journalDirectory, `${batchId}.json`)
    const journal = await open(journalPath, 'wx', 0o600)
    try {
        await journal.writeFile(JSON.stringify({ version: 1, userId, directoryKey, keys }))
        await journal.sync()
    } finally {
        await journal.close()
    }

    const cleanup = async () => {
        // A failed COMMIT response is ambiguous. Never remove committed content.
        // If the DB is unavailable, retain the journal and content for recovery.
        const committed = await prisma.$transaction(async tx => {
            // Wait for an uncertain COMMIT to finish before deciding what is orphaned.
            await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${batchId}, 0))`
            const references = await tx.files.findMany({
                where: { storage_key: { in: keys } }, select: { storage_key: true }
            })
            // Respect an existing archive table without changing deletion behavior.
            const archive = await tx.$queryRaw<{ present: boolean }[]>`
                SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema() AND table_name = 'trash'
                    AND column_name = 'storage_key') AS present
            `
            if (archive[0]?.present) {
                references.push(...await tx.$queryRaw<{ storage_key: string }[]>`
                    SELECT storage_key FROM trash WHERE storage_key = ANY(${keys}::text[])
                `)
            }
            return references
        })
        const retained = new Set(committed.map(file => file.storage_key))
        for (const key of keys) {
            if (retained.has(key)) continue
            try { await unlink(storagePath(key)) } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
            }
        }
        if (!retained.size) await rmdir(storagePath(directoryKey)).catch(error => {
            if (error.code !== 'ENOENT') throw error
        })
        await unlink(journalPath)
    }

    try {
        for (let i = 0; i < files.length; i++) {
            await saveFileToStorage(userId, files[i]!, keys[i]!)
        }
    } catch (error) {
        await cleanup().catch(cleanupError => console.error('Upload recovery required:', cleanupError))
        throw error
    }
    return {
        keys,
        commit: <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${batchId}, 0))`
            return work(tx)
        }, { maxWait: 10000, timeout: 30000 }),
        finish: () => unlink(journalPath).catch(error => console.error('Upload journal cleanup failed:', error)),
        rollback: () => cleanup().catch(error => console.error('Upload recovery required:', error))
    }
}
