import { getRouterParam } from 'h3'
import { ownedUploadSession, discardUpload } from '../../../utils/resumableUpload'
import { assertShareOrigin } from '../../../utils/shares'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const session = await ownedUploadSession(event, getRouterParam(event, 'id') ?? '', true)
    return discardUpload(session.id)
})
