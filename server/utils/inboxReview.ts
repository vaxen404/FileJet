import { stat, unlink } from 'node:fs/promises'
import type { Prisma } from '~~/src/generated/prisma/client'
import { lockStorageUser, reserveStorage } from './storage'
import { storagePath } from './files'
import { availableRequestFilename } from './inboxValidation'
import { throwError } from './error'

export async function lockOwnedInbox(tx: Prisma.TransactionClient, userId: string, id: string) {
    // All Inbox uploads, reviews, edits and removals use the same lock order.
    await lockStorageUser(tx, userId)
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM file_requests WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
    if (!rows.length) throwError(404, 'Inbox not found.')
    const request = await tx.file_requests.findFirst({ where: { id, user_id: userId } })
    if (!request) throwError(404, 'Inbox not found.')
    return request
}

export async function pendingInboxUpload(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadId: string) {
    const upload = await tx.request_uploads.findFirst({ where: { id: uploadId, request_id: requestId, request: { user_id: userId } } })
    if (!upload) throwError(404, 'Incoming file not found.')
    if (upload.status !== 'pending' || !upload.storage_key) throwError(409, 'This file has already been reviewed.')
    if (!upload.storage_key.startsWith(`${userId}/`)) throwError(409, 'Invalid incoming file storage.')
    return upload as typeof upload & { storage_key: string }
}

export async function approveInboxUpload(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadId: string, folderId: string | null) {
    await lockOwnedInbox(tx, userId, requestId)
    const upload = await pendingInboxUpload(tx, userId, requestId, uploadId)
    if (folderId) {
        const folders = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM folders WHERE id = ${folderId}::uuid AND user_id = ${userId}::uuid FOR KEY SHARE`
        if (!folders.length) throwError(404, 'Destination folder not found.')
    }
    const content = await stat(storagePath(upload.storage_key)).catch(() => null)
    if (!content?.isFile() || BigInt(content.size) !== upload.size) throwError(409, 'The incoming file is unavailable. You can reject it to release its storage.')
    const existing = await tx.files.findMany({ where: { user_id: userId, folder_id: folderId }, select: { original_name: true } })
    const name = availableRequestFilename(upload.name, new Set(existing.map(file => file.original_name.toLowerCase())))
    const file = await tx.files.create({ data: {
        user_id: userId, folder_id: folderId, name, original_name: name,
        mime_type: upload.mime_type, size: upload.size, storage_key: upload.storage_key
    } })
    await tx.request_uploads.update({ where: { id: upload.id }, data: {
        status: 'approved', file_id: file.id, storage_key: null, reviewed_at: new Date(), name
    } })
    // Bytes were reserved when received; approving must not charge them again.
    return { fileId: file.id, name }
}

export async function rejectInboxUpload(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadId: string) {
    await lockOwnedInbox(tx, userId, requestId)
    const upload = await pendingInboxUpload(tx, userId, requestId, uploadId)
    await reserveStorage(tx, userId, -upload.size)
    await tx.request_uploads.update({ where: { id: upload.id }, data: { status: 'rejected', storage_key: null, reviewed_at: new Date() } })
    return upload.storage_key
}

export async function removeInboxStoredFiles(keys: string[]) {
    for (const key of keys) {
        await unlink(storagePath(key)).catch(error => {
            if (error.code !== 'ENOENT') console.error('[INBOX CLEANUP ERROR]', error)
        })
    }
}

async function pendingInboxUploads(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadIds: string[]) {
    await lockOwnedInbox(tx, userId, requestId)
    const uploads = await tx.request_uploads.findMany({ where: {
        id: { in: uploadIds }, request_id: requestId, request: { user_id: userId }
    } })
    if (uploads.length !== uploadIds.length) throwError(404, 'Some selected files were not found in this inbox.')
    if (uploads.some(upload => upload.status !== 'pending' || !upload.storage_key))
        throwError(409, 'Some selected files were already reviewed. Refresh the inbox and select them again.')
    if (uploads.some(upload => !upload.storage_key!.startsWith(`${userId}/`))) throwError(409, 'Invalid incoming file storage.')
    const byId = new Map(uploads.map(upload => [upload.id, upload]))
    return uploadIds.map(id => byId.get(id)!) as (typeof uploads[number] & { storage_key: string })[]
}

export async function approveInboxUploads(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadIds: string[], folderId: string | null) {
    const uploads = await pendingInboxUploads(tx, userId, requestId, uploadIds)
    if (folderId) {
        const folders = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM folders WHERE id = ${folderId}::uuid AND user_id = ${userId}::uuid FOR KEY SHARE`
        if (!folders.length) throwError(404, 'Destination folder not found.')
    }
    // Check every stored file before writing any approval records.
    for (const upload of uploads) {
        const content = await stat(storagePath(upload.storage_key)).catch(() => null)
        if (!content?.isFile() || BigInt(content.size) !== upload.size)
            throwError(409, `The incoming file “${upload.name}” is unavailable. No selected files were approved.`)
    }
    const existing = await tx.files.findMany({ where: { user_id: userId, folder_id: folderId }, select: { original_name: true } })
    const names = new Set(existing.map(file => file.original_name.toLowerCase()))
    const files: { fileId: string; name: string }[] = []
    const reviewedAt = new Date()
    for (const upload of uploads) {
        const name = availableRequestFilename(upload.name, names)
        names.add(name.toLowerCase())
        const file = await tx.files.create({ data: {
            user_id: userId, folder_id: folderId, name, original_name: name,
            mime_type: upload.mime_type, size: upload.size, storage_key: upload.storage_key
        } })
        await tx.request_uploads.update({ where: { id: upload.id }, data: {
            status: 'approved', file_id: file.id, storage_key: null, reviewed_at: reviewedAt, name
        } })
        files.push({ fileId: file.id, name })
    }
    return { approvedCount: files.length, files }
}

export async function rejectInboxUploads(tx: Prisma.TransactionClient, userId: string, requestId: string, uploadIds: string[]) {
    const uploads = await pendingInboxUploads(tx, userId, requestId, uploadIds)
    await reserveStorage(tx, userId, -uploads.reduce((sum, upload) => sum + upload.size, 0n))
    const result = await tx.request_uploads.updateMany({
        where: { id: { in: uploadIds }, request_id: requestId, status: 'pending' },
        data: { status: 'rejected', storage_key: null, reviewed_at: new Date() }
    })
    if (result.count !== uploads.length) throwError(409, 'Some selected files changed. Refresh the inbox and try again.')
    return { rejectedCount: uploads.length, keys: uploads.map(upload => upload.storage_key) }
}
