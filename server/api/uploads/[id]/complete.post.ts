import { getRouterParam } from 'h3'
import { ownedUploadSession, finishUpload } from '../../../utils/resumableUpload'
import { assertShareOrigin } from '../../../utils/shares'
import { enforceRateLimit } from '../../../utils/rateLimit'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const session = await ownedUploadSession(event, getRouterParam(event, 'id') ?? '')
    enforceRateLimit(event, `upload-complete:${session.user_id}`, 60, 60000)
    return finishUpload(session.id, session.user_id)
})
