import { getRouterParam } from 'h3'
import { ownedUploadSession, sessionView } from '../../../utils/resumableUpload'
export default defineEventHandler(async event => sessionView(await ownedUploadSession(event, getRouterParam(event, 'id') ?? '')))
