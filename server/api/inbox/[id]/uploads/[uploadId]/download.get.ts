import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { storagePath } from '../../../../../utils/files'
import { throwError } from '../../../../../utils/error'

export default defineEventHandler(async event => {
    const userId = inboxOwner(event), id = inboxParam(event, 'id'), uploadId = inboxParam(event, 'uploadId')
    enforceRateLimit(event, `inbox-download:${userId}`, 30, 60000)
    const upload = await prisma.request_uploads.findFirst({ where: { id: uploadId, request_id: id, request: { user_id: userId }, status: 'pending' } })
    if (!upload?.storage_key || !upload.storage_key.startsWith(`${userId}/`)) throwError(404, 'Incoming file not found.')
    const path = storagePath(upload.storage_key)
    const content = await stat(path).catch(() => null)
    if (!content?.isFile()) throwError(404, 'Incoming file not found.')
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Content-Length', content.size)
    setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(upload.name)}`)
    return sendStream(event, createReadStream(path))
})
