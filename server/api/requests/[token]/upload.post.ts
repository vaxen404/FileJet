import { unlink } from 'node:fs/promises'
import { prisma } from '../../../utils/prisma'
import { publicFileRequest } from '../../../utils/inbox'
import { assertShareOrigin } from '../../../utils/shares'
import { readInboxUpload } from '../../../utils/inboxMultipart'
import { assertRequestOpen, validateRequestFiles } from '../../../utils/inboxValidation'
import { reserveStorage } from '../../../utils/storage'
import { saveFileToStorage, storagePath } from '../../../utils/files'
import { throwError } from '../../../utils/error'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    enforceRateLimit(event, 'inbox-public-upload', 10, 60000)
    const request = await publicFileRequest(event)
    const { parts, senderName, senderNote } = await readInboxUpload(event, request.max_file_size)
    const totalSize = validateRequestFiles(parts, request.max_file_size)
    const savedKeys: string[] = []
    let committed = false
    try {
        await prisma.$transaction(async tx => {
            // Serialize with other uploads for this owner before checking names and quota.
            await reserveStorage(tx, request.user_id, totalSize)
            await tx.$queryRaw`SELECT id FROM file_requests WHERE id = ${request.id}::uuid FOR UPDATE`
            const current = await tx.file_requests.findUnique({ where: { id: request.id } })
            if (!current) throwError(410, 'This file request is unavailable.')
            assertRequestOpen(current, parts.length)
            validateRequestFiles(parts, current.max_file_size)
            for (const part of parts) {
                const { storageKey } = await saveFileToStorage(request.user_id, part)
                savedKeys.push(storageKey)
                await tx.request_uploads.create({ data: {
                    request_id: request.id, name: part.filename, sender_name: senderName, sender_note: senderNote, size: BigInt(part.data.length),
                    status: 'pending', storage_key: storageKey, mime_type: part.type || null
                } })
            }
            await tx.file_requests.update({ where: { id: request.id }, data: { received_count: { increment: parts.length } } })
        }, { maxWait: 5000, timeout: 60000 })
        committed = true
        setResponseStatus(event, 201)
        // Never return file IDs, storage paths, folder contents, or owner details to a sender.
        return { success: true, uploadedCount: parts.length }
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error) throw error
        console.error('[INBOX UPLOAD ERROR]', error)
        throwError(500, 'Could not upload files. Please try again.')
    } finally {
        if (!committed) {
            for (const key of savedKeys) {
                await unlink(storagePath(key)).catch(error => {
                    if (error.code !== 'ENOENT') console.error('[INBOX CLEANUP ERROR]', error)
                })
            }
        }
    }
})
