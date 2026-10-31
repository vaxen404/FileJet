import { prisma } from '../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../utils/inbox'
import { assertShareOrigin } from '../../../../utils/shares'
import { readShareBody } from '../../../../utils/shareBody'
import { parseInboxReviewIds } from '../../../../utils/inboxValidation'
import { rejectInboxUploads, removeInboxStoredFiles } from '../../../../utils/inboxReview'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), id = inboxParam(event, 'id')
    enforceRateLimit(event, `inbox-bulk-review:${userId}`, 20, 60000)
    const body = await readShareBody(event, 65536)
    const uploadIds = parseInboxReviewIds(body.uploadIds)
    const result = await prisma.$transaction(tx => rejectInboxUploads(tx, userId, id, uploadIds), { maxWait: 5000, timeout: 60000 })
    await removeInboxStoredFiles(result.keys)
    return { rejectedCount: result.rejectedCount }
})
