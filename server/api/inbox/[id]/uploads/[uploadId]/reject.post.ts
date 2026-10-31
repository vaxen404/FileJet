import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { assertShareOrigin } from '../../../../../utils/shares'
import { rejectInboxUpload, removeInboxStoredFiles } from '../../../../../utils/inboxReview'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), id = inboxParam(event, 'id'), uploadId = inboxParam(event, 'uploadId')
    enforceRateLimit(event, `inbox-review:${userId}`, 60, 60000)
    const key = await prisma.$transaction(tx => rejectInboxUpload(tx, userId, id, uploadId), { timeout: 30000 })
    await removeInboxStoredFiles([key])
    return { success: true }
})
