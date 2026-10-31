import { throwError } from './error'
import { getHeader, getRequestWebStream, type H3Event } from 'h3'

export async function readShareBody(event: H3Event, maxBytes = 8192): Promise<Record<string, unknown>> {
    if (!getHeader(event, 'content-type')?.toLowerCase().startsWith('application/json')) {
        throwError(415, 'JSON request body required.')
    }

    const reader = getRequestWebStream(event)?.getReader()

    if (!reader) throwError(400, 'Request body required.')

    const chunks: Uint8Array[] = []
    let size = 0

    try {
        while (true) {
            const { value, done } = await reader.read()

            if (done) break

            size += value.byteLength

            if (size > maxBytes) {
                await reader.cancel().catch(() => {})

                throwError(413, 'Request body is too large.')
            }

            chunks.push(value)
        }
    } finally {
        reader.releaseLock()
    }

    try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))

        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()

        return value
    } catch {
        throwError(400, 'Invalid JSON request body.')
    }
}
