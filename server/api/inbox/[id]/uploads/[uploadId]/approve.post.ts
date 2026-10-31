import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { assertShareOrigin } from '../../../../../utils/shares'
import { readShareBody } from '../../../../../utils/shareBody'
import { approveInboxUpload } from '../../../../../utils/inboxReview'
import { isUuid } from '../../../../../utils/validation'
import { throwError } from '../../../../../utils/error'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), id = inboxParam(event, 'id'), uploadId = inboxParam(event, 'uploadId')
    enforceRateLimit(event, `inbox-review:${userId}`, 60, 60000)
    const body = await readShareBody(event)
    // The destination is explicit: null means Files, a UUID means a chosen folder.
    if (!('folderId' in body) || (body.folderId !== null && (typeof body.folderId !== 'string' || !isUuid(body.folderId))))
        throwError(400, 'Choose Files or a destination folder.')
    const folderId = body.folderId as string | null
    return await prisma.$transaction(tx => approveInboxUpload(tx, userId, id, uploadId, folderId), { timeout: 30000 })
})
