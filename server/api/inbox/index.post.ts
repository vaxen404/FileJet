import { randomUUID } from 'node:crypto'
import { prisma } from '../../utils/prisma'
import { inboxOwner } from '../../utils/inbox'
import { assertShareOrigin } from '../../utils/shares'
import { readShareBody } from '../../utils/shareBody'
import { parseFileRequest } from '../../utils/inboxValidation'
import { throwError } from '../../utils/error'
import { lockStorageUser } from '../../utils/storage'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    enforceRateLimit(event, `inbox-create:${userId}`, 10, 60000)
    const settings = parseFileRequest(await readShareBody(event))
    await prisma.$transaction(async tx => {
        await lockStorageUser(tx, userId)
        if (await tx.file_requests.count({ where: { user_id: userId } }) >= 50) throwError(400, 'You can keep up to 50 file requests. Remove an old request first.')
        if (settings.folderId && !await tx.folders.findFirst({ where: { id: settings.folderId, user_id: userId }, select: { id: true } }))
            throwError(404, 'Destination folder not found.')
        await tx.file_requests.create({ data: {
            user_id: userId, folder_id: settings.folderId, title: settings.title, description: settings.description,
            expires_at: settings.expiresAt, max_file_size: settings.maxFileSize, max_files: settings.maxFiles, token: randomUUID()
        } })
    })
    setResponseStatus(event, 201)
    return { success: true }
})
