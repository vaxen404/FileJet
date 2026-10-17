import { createError, getHeader, getRequestWebStream, type H3Event } from 'h3'

export async function readShareBody(event: H3Event): Promise<Record<string, unknown>> {
    if (!getHeader(event, 'content-type')?.toLowerCase().startsWith('application/json')) {
        throw createError({ statusCode: 415, message: 'JSON request body required.' })
    }
    const reader = getRequestWebStream(event)?.getReader()
    if (!reader) throw createError({ statusCode: 400, message: 'Request body required.' })
    const chunks: Uint8Array[] = []
    let size = 0
    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > 8192) {
                await reader.cancel().catch(() => {})
                throw createError({ statusCode: 413, message: 'Request body is too large.' })
            }
            chunks.push(value)
        }
    } finally { reader.releaseLock() }
    try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
        return value
    } catch { throw createError({ statusCode: 400, message: 'Invalid JSON request body.' }) }
}
