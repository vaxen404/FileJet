import { createHash } from 'node:crypto'
import { mkdir, open, link, readFile, stat, rm, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getHeader, getRequestWebStream, setHeader, type H3Event } from 'h3'
import type { Prisma, upload_sessions } from '~~/src/generated/prisma/client'
import { prisma } from './prisma'
import { getAuthSession } from './auth'
import { storagePath } from './files'
import { lockStorageUser, reserveStorage } from './storage'
import { throwError } from './error'
import { isUuid } from './validation'
import { assertRequestOpen } from './inboxValidation'
import { noteSchema } from '../../shared/schemas/note'
import { UPLOAD_CHUNK_SIZE, type UploadManifest, type UploadSessionView } from '../../shared/utils/resumableUpload'

export const accessHash = (key: string) => createHash('sha256').update(key).digest('hex')
export const stagedPath = (id: string, index: number) => {
    if (!isUuid(id) || !Number.isSafeInteger(index) || index < 0) throwError(400, 'Invalid upload part.')
    return storagePath(`.uploads/${id}/${index}`)
}
const manifestOf = (session: upload_sessions) => session.manifest as unknown as UploadManifest
export function sessionView(session: upload_sessions): UploadSessionView {
    return { id: session.id, offsets: session.offsets as number[], expiresAt: session.expires_at.toISOString(), completed: !!session.result, result: session.result as Record<string, unknown> | null }
}
export async function boundedUploadBody(event: H3Event, limit: number) {
    if (Number(getHeader(event, 'content-length')) > limit) throwError(413, 'Upload part is too large.')
    const reader = getRequestWebStream(event)?.getReader()
    if (!reader) return Buffer.alloc(0)
    let size = 0
    const chunks: Uint8Array[] = []
    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > limit) { await reader.cancel().catch(() => {}); throwError(413, 'Upload part is too large.') }
            chunks.push(value)
        }
    } finally { reader.releaseLock() }
    return Buffer.concat(chunks)
}
export async function ownedUploadSession(event: H3Event, id: string, allowDiscard = false) {
    setHeader(event, 'Cache-Control', 'no-store')
    const key = getHeader(event, 'upload-key') ?? ''
    if (!isUuid(id) || !/^[0-9a-f-]{72}$/i.test(key)) throwError(404, 'Upload not found.')
    const session = await prisma.upload_sessions.findUnique({ where: { id } })
    if (!session || session.access_hash !== accessHash(key) || (!session.request_id && getAuthSession(event)?.userId !== session.user_id)) throwError(404, 'Upload not found.')
    if (!allowDiscard && session.expires_at.getTime() <= Date.now()) throwError(410, 'This unfinished upload expired. Select the files again to start a new upload.')
    if (!allowDiscard && session.request_id && !session.result) {
        const request = await prisma.file_requests.findUnique({ where: { id: session.request_id } })
        if (!request) throwError(410, 'This inbox is unavailable.')
        assertRequestOpen(request, manifestOf(session).files.length)
    }
    return session
}
async function lockSession(tx: Prisma.TransactionClient, id: string, allowExpired = false) {
    await tx.$queryRaw`SELECT id FROM upload_sessions WHERE id = ${id}::uuid FOR UPDATE`
    const session = await tx.upload_sessions.findUnique({ where: { id } })
    if (!session || (!allowExpired && session.expires_at.getTime() <= Date.now())) throwError(410, 'This upload expired. Select the files again.')
    return session
}
export function assertUploadChunk(manifest: UploadManifest, index: number, offset: number, chunk: Buffer) {
    const file = manifest.files[index]
    if (!Number.isSafeInteger(index) || index < 0 || !file || !Number.isSafeInteger(offset) || offset < 0 || offset % UPLOAD_CHUNK_SIZE || offset >= file.size) throwError(400, 'Invalid upload offset.')
    if (chunk.length !== Math.min(UPLOAD_CHUNK_SIZE, file.size - offset)) throwError(400, 'Incomplete upload part. Please retry.')
    const hash = createHash('sha256').update(chunk).digest('hex')
    if (hash !== file.hashes[offset / UPLOAD_CHUNK_SIZE]) throwError(400, 'The file contents changed. Select the original file to resume.')
}
export async function writeUploadChunk(id: string, index: number, offset: number, chunk: Buffer) {
    return prisma.$transaction(async tx => {
        const session = await lockSession(tx, id), manifest = manifestOf(session)
        assertUploadChunk(manifest, index, offset, chunk)
        if (session.result) return sessionView(session)
        const offsets = [...session.offsets as number[]], accepted = offsets[index]!
        // A response can be lost after a chunk commits. Repeated identical chunks are safe.
        if (offset < accepted) return sessionView(session)
        if (offset !== accepted) throwError(409, 'Upload offset changed. Please resume this upload.')
        const path = stagedPath(id, index)
        await mkdir(dirname(path), { recursive: true })
        const handle = await open(path, 'r+').catch(error => {
            if (error.code !== 'ENOENT' || accepted !== 0) throw error
            return open(path, 'wx', 0o600)
        })
        try {
            // Drop bytes from a filesystem write whose database transaction never committed.
            await handle.truncate(accepted)
            let written = 0
            while (written < chunk.length) {
                const result = await handle.write(chunk, written, chunk.length - written, accepted + written)
                if (!result.bytesWritten) throw new Error('Could not write upload part.')
                written += result.bytesWritten
            }
            await handle.sync()
        } finally { await handle.close() }
        offsets[index] = accepted + chunk.length
        return sessionView(await tx.upload_sessions.update({ where: { id }, data: { offsets } }))
    }, { timeout: 30000 })
}
async function destination(tx: Prisma.TransactionClient, userId: string, folderId: string | null) {
    if (!folderId) return
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM folders WHERE id = ${folderId}::uuid AND user_id = ${userId}::uuid FOR KEY SHARE`
    if (!rows.length) throwError(404, 'Destination folder not found.')
}
export async function finishUpload(id: string, userId: string) {
    const result = await prisma.$transaction(async tx => {
        await lockStorageUser(tx, userId)
        const session = await lockSession(tx, id)
        if (session.result) return session.result as Record<string, unknown>
        const manifest = manifestOf(session), offsets = session.offsets as number[]
        if (manifest.files.some((file, index) => offsets[index] !== file.size)) throwError(409, 'The upload is incomplete. Resume it before finishing.')
        await destination(tx, userId, manifest.kind === 'inbox' ? null : manifest.folderId)
        if (session.request_id) {
            await tx.$queryRaw`SELECT id FROM file_requests WHERE id = ${session.request_id}::uuid FOR UPDATE`
            const request = await tx.file_requests.findUnique({ where: { id: session.request_id } })
            if (!request || request.user_id !== userId) throwError(410, 'This inbox is unavailable.')
            assertRequestOpen(request, manifest.files.length)
            if (manifest.files.some(file => file.size > request.max_file_size)) throwError(413, 'A file exceeds the current inbox size limit.')
        }
        if (manifest.kind !== 'notes') await reserveStorage(tx, userId, session.total_size)
        const folderCache = new Map<string, string>()
        let foldersCreated = 0
        for (const [index, file] of manifest.files.entries()) {
            const path = stagedPath(id, index)
            if (!file.size) {
                await mkdir(dirname(path), { recursive: true })
                const handle = await open(path, 'wx', 0o600).catch(error => { if (error.code !== 'EEXIST') throw error; return null })
                await handle?.close()
            }
            const content = await stat(path).catch(() => null)
            if (!content?.isFile() || content.size !== file.size) throwError(409, 'An upload part is unavailable. Select the files again.')
            let folderId = manifest.folderId
            if (manifest.kind === 'folders') {
                let current = ''
                for (const name of file.path.split('/').slice(0, -1)) {
                    current += '/' + name.toLowerCase()
                    if (folderCache.has(current)) { folderId = folderCache.get(current)!; continue }
                    let folder: { id: string } | null = await tx.folders.findFirst({ where: { user_id: userId, parent_folder_id: folderId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } })
                    if (!folder) { folder = await tx.folders.create({ data: { user_id: userId, parent_folder_id: folderId, name }, select: { id: true } }); foldersCreated++ }
                    folderId = folder.id; folderCache.set(current, folderId)
                }
            }
            if (manifest.kind === 'notes') {
                const bytes = await readFile(path), content = bytes.toString('utf8')
                if (!Buffer.from(content).equals(bytes)) throwError(400, 'Notes must contain valid UTF-8 text.')
                const parsed = noteSchema.safeParse({ title: file.name.replace(/\.(txt|md)$/i, '').trim(), content })
                if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid note.')
                if (await tx.notes.findFirst({ where: { user_id: userId, folder_id: folderId, title: { equals: parsed.data.title, mode: 'insensitive' } } })) throwError(409, `A note named “${parsed.data.title}” already exists.`)
                await reserveStorage(tx, userId, BigInt(Buffer.byteLength(parsed.data.content)))
                await tx.notes.create({ data: { user_id: userId, folder_id: folderId, title: parsed.data.title, content: parsed.data.content, size: BigInt(Buffer.byteLength(parsed.data.content)) } })
                continue
            }
            if (!session.request_id && await tx.files.findFirst({ where: { user_id: userId, folder_id: folderId, original_name: { equals: file.name, mode: 'insensitive' } } })) throwError(409, `A file named “${file.name}” already exists.`)
            const storageKey = `${userId}/${id}-${index}`, finalPath = storagePath(storageKey)
            await mkdir(dirname(finalPath), { recursive: true })
            await link(path, finalPath).catch(error => { if (error.code !== 'EEXIST') throw error })
            if (session.request_id) {
                await tx.request_uploads.create({ data: { request_id: session.request_id, name: file.name, sender_name: manifest.senderName, sender_note: manifest.senderNote, size: BigInt(file.size), mime_type: file.type || null, storage_key: storageKey, status: 'pending' } })
            } else await tx.files.create({ data: { user_id: userId, folder_id: folderId, name: file.name, original_name: file.name, mime_type: file.type || null, size: BigInt(file.size), storage_key: storageKey } })
        }
        if (session.request_id) await tx.file_requests.update({ where: { id: session.request_id }, data: { received_count: { increment: manifest.files.length } } })
        const result = { success: true, filesUploaded: manifest.files.length, uploadedCount: manifest.files.length, foldersCreated }
        await tx.upload_sessions.update({ where: { id }, data: { result } })
        return result
    }, { maxWait: 10000, timeout: 60000 })
    await rm(dirname(stagedPath(id, 0)), { recursive: true, force: true }).catch(error => console.error('[UPLOAD STAGING CLEANUP]', error))
    return result
}
export async function cleanupExpiredUploads() {
    const expired = await prisma.upload_sessions.findMany({ where: { expires_at: { lte: new Date() } }, take: 100, select: { id: true } })
    for (const { id } of expired) {
        await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM upload_sessions WHERE id = ${id}::uuid FOR UPDATE`
            const session = await tx.upload_sessions.findUnique({ where: { id } })
            if (!session || session.expires_at.getTime() > Date.now()) return
            if (!session.result) for (let i = 0; i < manifestOf(session).files.length; i++) await unlink(storagePath(`${session.user_id}/${id}-${i}`)).catch(error => { if (error.code !== 'ENOENT') throw error })
            await rm(dirname(stagedPath(id, 0)), { recursive: true, force: true })
            await tx.upload_sessions.delete({ where: { id } })
        }, { timeout: 30000 })
    }
}
export async function discardUpload(id: string) {
    return prisma.$transaction(async tx => {
        const session = await lockSession(tx, id, true)
        if (session.result) return { success: true }
        for (let index = 0; index < manifestOf(session).files.length; index++) {
            await unlink(storagePath(`${session.user_id}/${id}-${index}`)).catch(error => { if (error.code !== 'ENOENT') throw error })
        }
        await rm(dirname(stagedPath(id, 0)), { recursive: true, force: true })
        await tx.upload_sessions.delete({ where: { id } })
        return { success: true }
    }, { timeout: 30000 })
}
