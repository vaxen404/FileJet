import { inboxOwner } from '../../../utils/inbox'
import { ownedQuarantineRecord } from '../../../utils/quarantine'
import { scanStoredFile } from '../../../utils/fileSecurity'
import { assertShareOrigin } from '../../../utils/shares'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    enforceRateLimit(event, `file-scan:${userId}`, 20, 60000)
    const record = await ownedQuarantineRecord(userId, getRouterParam(event, 'id'))
    setHeader(event, 'Cache-Control', 'no-store')
    return scanStoredFile(userId, record.storage_key, true)
})
