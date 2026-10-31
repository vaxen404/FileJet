import { getHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import { getAuthSession } from '../../utils/auth'
import { throwError } from '../../utils/error'
import { enforceRateLimit } from '../../utils/rateLimit'
import { assertShareOrigin } from '../../utils/shares'
import { lockStorageUser } from '../../utils/storage'
import { assertRequestOpen } from '../../utils/inboxValidation'
import { isUuid } from '../../utils/validation'
import { accessHash, boundedUploadBody, ownedUploadSession, sessionView } from '../../utils/resumableUpload'
import { parseUploadManifest, UPLOAD_LIFETIME } from '../../../shared/utils/resumableUpload'
import { parseSender } from '../../../shared/utils/sender'
import { Prisma } from '~~/src/generated/prisma/client'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    enforceRateLimit(event, 'upload-session-start', 30, 60000)
    let body: Record<string, unknown>
    try {
        const value: unknown = JSON.parse((await boundedUploadBody(event, 1024 * 1024)).toString('utf8'))
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid upload details.')
        body = value as Record<string, unknown>
    }
    catch (error) { if ((error as { statusCode?: number }).statusCode) throw error; throwError(400, 'Invalid upload details.') }
    const id = body.id, key = getHeader(event, 'upload-key') ?? ''
    if (typeof id !== 'string' || !isUuid(id) || !/^[0-9a-f-]{72}$/i.test(key)) throwError(400, 'Invalid upload key.')
    let manifest: ReturnType<typeof parseUploadManifest>
    try { manifest = parseUploadManifest(body); Object.assign(manifest, parseSender(body)) }
    catch (error) { throwError(400, (error as Error).message) }
    const existing = await prisma.upload_sessions.findUnique({ where: { id } })
    if (existing) {
        const session = await ownedUploadSession(event, id)
        if (JSON.stringify(parseUploadManifest(session.manifest)) !== JSON.stringify(parseUploadManifest(manifest)) ||
            (session.manifest as Record<string, unknown>).senderName !== manifest.senderName || (session.manifest as Record<string, unknown>).senderNote !== manifest.senderNote) throwError(409, 'Upload details changed. Start a new upload.')
        return sessionView(session)
    }
    let userId: string, requestId: string | null = null
    if (manifest.kind === 'inbox') {
        const request = await prisma.file_requests.findUnique({ where: { token: manifest.requestToken } })
        if (!request) throwError(404, 'Inbox not found.')
        assertRequestOpen(request, manifest.files.length)
        if (manifest.files.some(file => file.size > request.max_file_size)) throwError(413, 'A file exceeds this inbox’s size limit.')
        userId = request.user_id; requestId = request.id
    } else {
        const session = getAuthSession(event)
        if (!session) throwError(401, 'You need to be logged in.')
        userId = session.userId
    }
    return prisma.$transaction(async tx => {
        const user = await lockStorageUser(tx, userId)
        if (manifest.folderId && manifest.kind !== 'inbox' && !await tx.folders.findFirst({ where: { id: manifest.folderId, user_id: userId } })) throwError(404, 'Destination folder not found.')
        const where = { user_id: userId, result: { equals: Prisma.DbNull }, expires_at: { gt: new Date() } }
        const active = await tx.upload_sessions.aggregate({ where, _sum: { total_size: true }, _count: true })
        if (active._count >= 20) throwError(429, 'Too many unfinished uploads. Finish an upload or wait for it to expire.')
        const size = BigInt(manifest.files.reduce((sum, file) => sum + file.size, 0))
        if ((user.storage_used ?? 0n) + (active._sum.total_size ?? 0n) + size > (user.storage_limit ?? 0n)) throwError(400, 'Not enough storage space, including unfinished uploads.')
        const session = await tx.upload_sessions.create({ data: {
            id, user_id: userId, request_id: requestId, access_hash: accessHash(key), total_size: size,
            manifest: JSON.parse(JSON.stringify(manifest)) as Prisma.InputJsonValue,
            offsets: manifest.files.map(() => 0), expires_at: new Date(Date.now() + UPLOAD_LIFETIME)
        } })
        return sessionView(session)
    })
})
