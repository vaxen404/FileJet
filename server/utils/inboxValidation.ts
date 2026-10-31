import { createError } from 'h3'

export const MAX_REQUEST_FILE_SIZE = 25 * 1024 * 1024
export const MAX_REQUEST_BATCH_SIZE = 50 * 1024 * 1024
export const MAX_REQUEST_BATCH_FILES = 6

export function parseInboxReviewIds(value: unknown): string[] {
    if (!Array.isArray(value) || !value.length || value.length > 1000 || value.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
        throw createError({ statusCode: 400, message: 'Select between 1 and 1000 incoming files.' })
    return [...new Set(value)]
}

const invalid = (message: string): never => { throw createError({ statusCode: 400, message }) }

export function parseFileRequest(body: Record<string, unknown>, now = Date.now(), allowUnchangedExpiration = false) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (!title || title.length > 120) invalid('Enter a title between 1 and 120 characters.')
    if (description.length > 1000) invalid('Description must be 1000 characters or fewer.')
    const maxFileSize = body.maxFileSize ?? 10 * 1024 * 1024
    const maxFiles = body.maxFiles ?? 100
    if (typeof maxFileSize !== 'number' || !Number.isInteger(maxFileSize) || maxFileSize < 1 || maxFileSize > MAX_REQUEST_FILE_SIZE)
        invalid('File size limit must be between 1 byte and 25 MB.')
    if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 1000)
        invalid('File count limit must be between 1 and 1000.')
    let expiresAt: Date | null = null
    if (body.expiresAt != null && body.expiresAt !== '') {
        if (typeof body.expiresAt !== 'string') invalid('Invalid expiration date.')
        expiresAt = new Date(body.expiresAt as string)
        if (!Number.isFinite(expiresAt.getTime()) || (!allowUnchangedExpiration && expiresAt.getTime() <= now)) invalid('Expiration must be in the future.')
    }
    const folderId = body.folderId ?? null
    if (folderId !== null && (typeof folderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(folderId)))
        invalid('Invalid destination folder.')
    return { title, description, maxFileSize: maxFileSize as number, maxFiles: maxFiles as number, expiresAt, folderId: folderId as string | null }
}

export function assertRequestOpen(request: { is_open: boolean; expires_at: Date | null; received_count: number; max_files: number }, count = 1, now = Date.now()) {
    if (!request.is_open || (request.expires_at && request.expires_at.getTime() <= now))
        throw createError({ statusCode: 410, message: 'This file request is closed or expired.' })
    if (request.received_count + count > request.max_files)
        throw createError({ statusCode: 410, message: 'This file request has reached its file limit.' })
}

export function validateRequestFiles(parts: { filename: string; data: Buffer }[], maxFileSize: number) {
    if (!parts.length || parts.length > MAX_REQUEST_BATCH_FILES) invalid('Choose between 1 and 6 files.')
    let total = 0
    for (const part of parts) {
        if (!part.filename || part.filename === '.' || part.filename === '..' || /[/\\\0\r\n]/.test(part.filename) || Buffer.byteLength(part.filename, 'utf8') > 255)
            invalid('Invalid filename.')
        if (part.data.length > maxFileSize) throw createError({ statusCode: 413, message: `Each file must be ${Math.floor(maxFileSize / 1024 / 1024)} MB or smaller.` })
        total += part.data.length
    }
    if (total > MAX_REQUEST_BATCH_SIZE) throw createError({ statusCode: 413, message: 'Upload up to 50 MB at a time.' })
    return BigInt(total)
}

// Keep existing files intact, including collisions within the same submitted batch.
export function availableRequestFilename(filename: string, existingNames: Set<string>) {
    if (!existingNames.has(filename.toLowerCase())) return filename
    const dot = filename.lastIndexOf('.')
    const extension = dot > 0 ? filename.slice(dot) : ''
    const base = dot > 0 ? filename.slice(0, dot) : filename
    for (let suffix = 1; ; suffix++) {
        const ending = ` (${suffix})${extension}`
        let stem = base
        while (Buffer.byteLength(stem + ending, 'utf8') > 255 && stem.length) stem = [...stem].slice(0, -1).join('')
        const candidate = stem + ending
        if (Buffer.byteLength(candidate, 'utf8') > 255) invalid('Filename extension is too long.')
        if (!existingNames.has(candidate.toLowerCase())) return candidate
    }
}
