import { prisma } from '../../utils/prisma'
import { inboxOwner, inboxParam } from '../../utils/inbox'
import { assertShareOrigin } from '../../utils/shares'
import { readShareBody } from '../../utils/shareBody'
import { throwError } from '../../utils/error'
import { parseFileRequest } from '../../utils/inboxValidation'
import { lockOwnedInbox } from '../../utils/inboxReview'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    const id = inboxParam(event, 'id')
    enforceRateLimit(event, `inbox-update:${userId}`, 30, 60000)
    const body = await readShareBody(event)
    if (body.isOpen !== undefined && typeof body.isOpen !== 'boolean') throwError(400, 'Invalid inbox status.')
    if (!('title' in body) && typeof body.isOpen !== 'boolean') throwError(400, 'Enter inbox settings or status.')
    await prisma.$transaction(async tx => {
        const current = await lockOwnedInbox(tx, userId, id)
        const keepExpiration = body.expiresAt === (current.expires_at?.toISOString() ?? null)
        const settings = 'title' in body ? parseFileRequest(body, Date.now(), keepExpiration) : null
        if (settings && settings.maxFiles < current.received_count) throwError(400, `The file limit cannot be lower than ${current.received_count} files already received.`)
        if (settings?.folderId && !await tx.folders.findFirst({ where: { id: settings.folderId, user_id: userId }, select: { id: true } }))
            throwError(404, 'Destination folder not found.')
        await tx.file_requests.update({ where: { id }, data: {
            ...(settings ? { title: settings.title, description: settings.description, folder_id: settings.folderId,
                max_file_size: settings.maxFileSize, max_files: settings.maxFiles, ...(!keepExpiration ? { expires_at: settings.expiresAt } : {}) } : {}),
            ...(typeof body.isOpen === 'boolean' ? { is_open: body.isOpen } : {})
        } })
    })
    return { success: true }
})
