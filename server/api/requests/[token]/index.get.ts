import { publicFileRequest } from '../../../utils/inbox'
import { MAX_REQUEST_BATCH_FILES } from '../../../utils/inboxValidation'

export default defineEventHandler(async event => {
    enforceRateLimit(event, 'inbox-public-read', 60, 60000)
    const request = await publicFileRequest(event)
    return { title: request.title, description: request.description, maxFileSize: request.max_file_size, maxFilesPerUpload: Math.min(MAX_REQUEST_BATCH_FILES, request.max_files - request.received_count) }
})
