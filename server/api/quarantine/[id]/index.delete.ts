import { prisma } from '../../../utils/prisma'
import { inboxOwner } from '../../../utils/inbox'
import { ownedQuarantineRecord, stagedReference } from '../../../utils/quarantine'
import { discardUpload } from '../../../utils/resumableUpload'
import { assertShareOrigin } from '../../../utils/shares'
import { throwError } from '../../../utils/error'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    const record = await ownedQuarantineRecord(userId, getRouterParam(event, 'id'))
    const ref = stagedReference(userId, record.storage_key)
    const upload = ref && await prisma.upload_sessions.findFirst({ where: { id: ref.id, user_id: userId } })
    if (!upload || upload.result) throwError(404, 'Unfinished upload not found.')
    return discardUpload(upload.id)
})
