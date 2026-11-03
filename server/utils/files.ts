import { randomUUID } from 'node:crypto'
import { resolve, dirname, sep } from 'node:path'
import { mkdir, open, unlink } from 'node:fs/promises'
import type { MultiPartData } from 'h3'
import type { Prisma } from '~~/src/generated/prisma/client'
import { resolveStoragePath as storagePath } from './storagePaths'
import { recordCleanUpload, requireCleanScan } from './fileSecurity'
import { scanClamBytes, type ScanVerdict } from './clamav'
export { resolveStoragePath as storagePath } from './storagePaths'

export type FilePart = MultiPartData & { name: 'files'; filename: string }

export function isFilePart(part: MultiPartData): part is FilePart {
    return (
        part.name === 'files' &&
        typeof part.filename === 'string' &&
        part.filename.length > 0 &&
        Buffer.isBuffer(part.data)
    )
}

export const getFileParts = (formData: MultiPartData[]): FilePart[] => formData.filter(isFilePart)

export const getTotalUploadSize = (files: FilePart[]): bigint =>
    files.reduce((total, file) => total + BigInt(file.data.length), 0n)

export async function saveFileToStorage(userId: string, file: FilePart, key?: string, db?: Prisma.TransactionClient, scanned?: ScanVerdict) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
        throw new Error('Invalid storage owner.')
    }

    const safeName = file.filename.replace(/[/\\\0]/g, '_')
    const proof = scanned ?? await scanClamBytes(file.data)
    requireCleanScan(proof)
    const storageKey = key ?? `${userId}/${randomUUID()}`

    if (!storageKey.startsWith(`${userId}/`)) {
        throw new Error('Invalid storage owner.')
    }

    const filePath = storagePath(storageKey)

    if (!filePath.startsWith(storagePath(userId) + sep)) {
        throw new Error('Invalid storage owner.')
    }

    await mkdir(dirname(filePath), { recursive: true })

    const handle = await open(filePath, 'wx', 0o600)

    try {
        await handle.writeFile(file.data)
        await handle.sync()
        await handle.close()
        await recordCleanUpload(userId, storageKey, proof, db)
    } catch (error) {
        await handle.close().catch(() => {})

        try {
            await unlink(filePath)
        } catch (cleanupError) {
            if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error('Failed upload cleanup:', cleanupError)
            }
        }

        throw error
    }

    return { safeName, storageKey }
}
