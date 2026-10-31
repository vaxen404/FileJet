import { prisma } from '../../utils/prisma'
import { inboxOwner, inboxParam } from '../../utils/inbox'
import { assertShareOrigin } from '../../utils/shares'
import { lockOwnedInbox, removeInboxStoredFiles } from '../../utils/inboxReview'
import { reserveStorage } from '../../utils/storage'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    const id = inboxParam(event, 'id')
    const keys = await prisma.$transaction(async tx => {
        await lockOwnedInbox(tx, userId, id)
        const pending = await tx.request_uploads.findMany({ where: { request_id: id, status: 'pending' }, select: { storage_key: true, size: true } })
        await reserveStorage(tx, userId, -pending.reduce((sum, upload) => sum + upload.size, 0n))
        await tx.file_requests.delete({ where: { id } })
        return pending.flatMap(upload => upload.storage_key ? [upload.storage_key] : [])
    }, { timeout: 30000 })
    await removeInboxStoredFiles(keys)
    return { success: true }
})
