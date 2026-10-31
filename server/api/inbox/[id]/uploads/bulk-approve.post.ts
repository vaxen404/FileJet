import { prisma } from '../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../utils/inbox'
import { assertShareOrigin } from '../../../../utils/shares'
import { readShareBody } from '../../../../utils/shareBody'
import { parseInboxReviewIds } from '../../../../utils/inboxValidation'
import { approveInboxUploads } from '../../../../utils/inboxReview'
import { isUuid } from '../../../../utils/validation'
import { throwError } from '../../../../utils/error'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), id = inboxParam(event, 'id')
    enforceRateLimit(event, `inbox-bulk-review:${userId}`, 20, 60000)
    const body = await readShareBody(event, 65536)
    const uploadIds = parseInboxReviewIds(body.uploadIds)
    if (!('folderId' in body) || (body.folderId !== null && (typeof body.folderId !== 'string' || !isUuid(body.folderId))))
        throwError(400, 'Choose Files or a destination folder.')
    const folderId = body.folderId as string | null
    return await prisma.$transaction(tx => approveInboxUploads(tx, userId, id, uploadIds, folderId), { maxWait: 5000, timeout: 60000 })
})
