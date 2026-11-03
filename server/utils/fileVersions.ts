import { safeStoragePath, assertCachedClean } from '~~/server/utils/fileSecurity'
import { constants } from 'node:fs'
import { copyFile, stat, unlink, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, extname } from 'node:path'
import type { Prisma, files } from '~~/src/generated/prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { lockStorageUser, reserveStorage } from './storage'
import { resolveTrashStoragePath } from './trashStorage'
import { throwError } from './error'

export async function lockVersionedFile(tx: Prisma.TransactionClient, userId: string, fileId: string, expectedRevision?: number) {
    await lockStorageUser(tx, userId)
    await tx.$queryRaw`SELECT id FROM files WHERE id = ${fileId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
    const file = await tx.files.findFirst({ where: { id: fileId, user_id: userId } })
    if (!file) throwError(404, 'File not found.')
    if (expectedRevision !== undefined && file.revision !== expectedRevision) throwError(409, 'This file changed. Refresh its history before trying again.')
    return file
}
export async function archiveCurrentFile(tx: Prisma.TransactionClient, file: files) {
    if (await tx.file_versions.count({ where: { file_id: file.id, user_id: file.user_id } }) >= 50) throwError(409, 'This file has 50 saved versions. Delete an old version before adding another.')
    const content = await stat(resolveTrashStoragePath(file.user_id, file.storage_key)).catch(() => null)
    if (!content?.isFile() || BigInt(content.size) !== file.size) throwError(409, 'The current file is unavailable. Its contents cannot be archived.')
    await tx.file_versions.create({ data: { user_id: file.user_id, file_id: file.id, revision: file.revision, name: file.original_name, mime_type: file.mime_type, size: file.size, storage_key: file.storage_key, created_at: file.updated_at ?? file.created_at ?? new Date() } })
}
export async function replaceVersionedFile(tx: Prisma.TransactionClient, userId: string, fileId: string, expectedRevision: number, incoming: { name: string; mimeType: string | null; size: bigint; storageKey: string }) {
    const file = await lockVersionedFile(tx, userId, fileId, expectedRevision)
    if (extname(file.original_name).toLowerCase() !== extname(incoming.name).toLowerCase()) throwError(400, 'Choose a replacement with the same file extension.')
    await archiveCurrentFile(tx, file)
    // The current bytes remain as a saved version; only the incoming bytes are new.
    await reserveStorage(tx, userId, incoming.size)
    return tx.files.update({ where: { id: fileId }, data: { storage_key: incoming.storageKey, size: incoming.size, mime_type: incoming.mimeType, revision: { increment: 1 }, updated_at: new Date(), metadata_checked_at: null, metadata_signature: null } })
}
export async function restoreFileVersion(userId: string, fileId: string, versionId: string, revision: number) {
    const initial = await prisma.file_versions.findFirst({ where: { id: versionId, file_id: fileId, user_id: userId } })
    if (!initial) throwError(404, 'Version not found.')
    await safeStoragePath(userId, initial.storage_key)
    let newKey = '', committed = false
    try {
        return await prisma.$transaction(async tx => {
            const file = await lockVersionedFile(tx, userId, fileId, revision)
            const version = await tx.file_versions.findFirst({ where: { id: versionId, file_id: fileId, user_id: userId } })
            if (!version) throwError(404, 'Version not found.')
            await archiveCurrentFile(tx, file)
            await reserveStorage(tx, userId, version.size)
            const source = await assertCachedClean(userId, version.storage_key, tx), content = await stat(source).catch(() => null)
            if (!content?.isFile() || BigInt(content.size) !== version.size) throwError(409, 'This saved version is unavailable.')
            newKey = `${userId}/${randomUUID()}`
            const target = resolveTrashStoragePath(userId, newKey)
            await mkdir(dirname(target), { recursive: true })
            await copyFile(source, target, constants.COPYFILE_EXCL)
            await tx.files.update({ where: { id: fileId }, data: { storage_key: newKey, size: version.size, mime_type: version.mime_type, revision: { increment: 1 }, updated_at: new Date(), metadata_checked_at: null, metadata_signature: null } })
            return { success: true }
        }, { timeout: 60000 }).then(result => { committed = true; return result })
    } finally { if (newKey && !committed) await unlink(resolveTrashStoragePath(userId, newKey)).catch(() => {}) }
}
export async function removeFileVersions(tx: Prisma.TransactionClient, userId: string, fileIds: string[]) {
    const versions = await tx.file_versions.findMany({ where: { user_id: userId, file_id: { in: fileIds } } })
    for (const version of versions) resolveTrashStoragePath(userId, version.storage_key)
    await tx.file_versions.deleteMany({ where: { user_id: userId, file_id: { in: fileIds } } })
    return { size: versions.reduce((sum, version) => sum + version.size, 0n), keys: versions.map(version => version.storage_key) }
}
