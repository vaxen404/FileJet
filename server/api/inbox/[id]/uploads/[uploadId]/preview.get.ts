import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { storagePath } from '../../../../../utils/files'
import { throwError } from '../../../../../utils/error'
import { getInboxPreview, inboxPreviewRange } from '~~/shared/utils/inboxPreview'

export default defineEventHandler(async event => {
    const userId = inboxOwner(event), id = inboxParam(event, 'id'), uploadId = inboxParam(event, 'uploadId')
    enforceRateLimit(event, `inbox-preview:${userId}`, 120, 60000)
    const upload = await prisma.request_uploads.findFirst({ where: {
        id: uploadId, request_id: id, request: { user_id: userId }, status: 'pending'
    } })
    if (!upload?.storage_key || !upload.storage_key.startsWith(`${userId}/`)) throwError(404, 'Incoming file not found.')
    const path = storagePath(upload.storage_key)
    const content = await stat(path).catch(() => null)
    if (!content?.isFile()) throwError(404, 'Incoming file not found.')
    const preview = getInboxPreview(upload.name, upload.mime_type)
    if (preview.kind === 'unsupported') throwError(415, 'Preview is not available for this file type.')

    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'")
    setHeader(event, 'Content-Type', preview.contentType)
    setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(upload.name)}`)

    if (preview.kind === 'text') {
        const size = Math.min(content.size, 1024 * 1024)
        setHeader(event, 'X-Preview-Truncated', String(content.size > size))
        setHeader(event, 'Content-Length', size)
        return size ? sendStream(event, createReadStream(path, { start: 0, end: size - 1 })) : ''
    }

    setHeader(event, 'Accept-Ranges', 'bytes')
    const requestedRange = getHeader(event, 'range')
    if (requestedRange) {
        const range = inboxPreviewRange(requestedRange, content.size)
        if (!range) {
            setResponseStatus(event, 416)
            setHeader(event, 'Content-Range', `bytes */${content.size}`)
            return ''
        }
        setResponseStatus(event, 206)
        setHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${content.size}`)
        setHeader(event, 'Content-Length', range.end - range.start + 1)
        return sendStream(event, createReadStream(path, range))
    }
    setHeader(event, 'Content-Length', content.size)
    return sendStream(event, createReadStream(path))
})
