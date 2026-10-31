import { getHeader, getRouterParam } from 'h3'
import { ownedUploadSession, boundedUploadBody, writeUploadChunk } from '../../../utils/resumableUpload'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { assertShareOrigin } from '../../../utils/shares'
import { UPLOAD_CHUNK_SIZE } from '../../../../shared/utils/resumableUpload'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const session = await ownedUploadSession(event, getRouterParam(event, 'id') ?? '')
    enforceRateLimit(event, `upload-chunk:${session.user_id}`, 6000, 60000)
    const chunk = await boundedUploadBody(event, UPLOAD_CHUNK_SIZE)
    return writeUploadChunk(session.id, Number(getRouterParam(event, 'index')), Number(getHeader(event, 'upload-offset')), chunk)
})
