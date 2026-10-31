import { getHeader, getRequestWebStream, type H3Event } from 'h3'
import type { FilePart } from './files'
import { throwError } from './error'
import { MAX_REQUEST_BATCH_SIZE, MAX_REQUEST_BATCH_FILES } from './inboxValidation'

export async function readInboxUpload(event: H3Event, maxFileSize: number) {
    const contentType = getHeader(event, 'content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throwError(415, 'Multipart upload required.')
    const limit = Math.min(MAX_REQUEST_BATCH_SIZE, maxFileSize * MAX_REQUEST_BATCH_FILES) + 65536
    if (Number(getHeader(event, 'content-length')) > limit) throwError(413, 'Upload is too large.')
    const reader = getRequestWebStream(event)?.getReader()
    if (!reader) throwError(400, 'Choose files to upload.')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > limit) {
                await reader.cancel().catch(() => {})
                throwError(413, 'Upload is too large.')
            }
            chunks.push(value)
        }
    } finally { reader.releaseLock() }
    let form: FormData
    try {
        form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { 'Content-Type': contentType } }).formData()
    } catch { throwError(400, 'Invalid upload data.') }
    const entries = [...form.entries()]
    if (entries.length > MAX_REQUEST_BATCH_FILES + 1 || entries.some(([name]) => !['files', 'senderName'].includes(name)))
        throwError(400, 'Invalid upload fields.')
    const sender = form.getAll('senderName')
    if (sender.length > 1 || (sender[0] !== undefined && typeof sender[0] !== 'string')) throwError(400, 'Invalid sender name.')
    const senderName = typeof sender[0] === 'string' ? sender[0].trim() : ''
    if (senderName.length > 100) throwError(400, 'Sender name must be 100 characters or fewer.')
    const parts: FilePart[] = []
    for (const value of form.getAll('files')) {
        if (typeof value === 'string') throwError(400, 'Invalid file.')
        parts.push({ name: 'files', filename: value.name, type: value.type, data: Buffer.from(await value.arrayBuffer()) })
    }
    return { parts, senderName }
}
