import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import { sep } from 'node:path'
import type { Prisma, file_scans } from '~~/src/generated/prisma/client'
import type { FileScanState, FileScanStatus } from '../../shared/types/fileScan'
import { prisma } from './prisma'
import { resolveStoragePath as storagePath } from './storagePaths'
import { throwError } from './error'
import { clamConfig, scanClamPath, scanClamBytes, type ScanVerdict } from './clamav'

const pending = new Map<string, Promise<FileScanState>>()
const unscanned = (): FileScanState => ({ status: 'unscanned', threat: null, message: null, checkedAt: null })
const serialize = (record: file_scans): FileScanState => ({ status: record.status as FileScanStatus, threat: record.threat, message: record.message, checkedAt: record.checked_at?.toISOString() ?? null })
export const fileSignature = async (path: string) => {
    const info = await stat(path, { bigint: true })
    if (!info.isFile()) throwError(404, 'Stored file not found.')
    return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`
}
async function ownedPath(userId: string, key: string) {
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !key.startsWith(userId + '/')) throwError(404, 'Stored file not found.')
    const [path, owner] = await Promise.all([realpath(storagePath(key)), realpath(storagePath(userId))]).catch(() => [null, null])
    if (!path || !owner || !path.startsWith(owner + sep)) throwError(404, 'Stored file not found.')
    return path
}
export function requireCleanScan(state: { status: string; message?: string | null }) {
    if (state.status === 'clean') return
    if (state.status === 'infected') throwError(423, 'Threat detected. This file is quarantined; download, preview and sharing are blocked.')
    if (state.status === 'scanning') throwError(423, 'This file is being scanned. Try again when scanning finishes.')
    throwError(424, state.message || 'This file has not completed an antivirus scan. Access is blocked until scanning succeeds.')
}

export async function scanUploadParts<T extends { data: Buffer }>(parts: T[]) {
    const proofs = new Map<T, ScanVerdict>()
    for (const part of parts) {
        const result = await scanClamBytes(part.data)
        requireCleanScan(result)
        proofs.set(part, result)
    }
    return proofs
}
export async function recordCleanUpload(userId: string, key: string, proof: ScanVerdict, db: Prisma.TransactionClient = prisma) {
    requireCleanScan(proof)
    const signature = await fileSignature(storagePath(key))
    const data = { user_id: userId, status: 'clean', signature, sha256: proof.sha256, threat: null, message: null, checked_at: new Date(), claim: null }
    await db.file_scans.upsert({ where: { storage_key: key }, create: { storage_key: key, ...data }, update: data })
}
export async function getFileScan(userId: string, key: string): Promise<FileScanState> {
    const record = await prisma.file_scans.findFirst({ where: { storage_key: key, user_id: userId } })
    if (!record) return unscanned()
    if (record.status === 'scanning' && Date.now() - record.updated_at.getTime() > clamConfig().timeout + 45000)
        return { status: 'error', threat: null, message: 'The previous scan was interrupted. Scan this file again.', checkedAt: null }
    try {
        if (record.signature !== await fileSignature(await ownedPath(userId, key))) return unscanned()
        return serialize(record)
    } catch { return { status: 'error', threat: null, message: 'Stored file unavailable.', checkedAt: null } }
}

export function scanStoredFile(userId: string, key: string, force = false): Promise<FileScanState> {
    if (pending.has(key)) return pending.get(key)!
    const work = performScan(userId, key, force).finally(() => pending.delete(key))
    pending.set(key, work)
    return work
}
async function performScan(userId: string, key: string, force: boolean): Promise<FileScanState> {
    const path = await ownedPath(userId, key), signature = await fileSignature(path)
    const record = await prisma.file_scans.upsert({ where: { storage_key: key }, create: { storage_key: key, user_id: userId }, update: {} })
    if (record.user_id !== userId) throwError(404, 'Stored file not found.')
    const age = Date.now() - (record.checked_at?.getTime() ?? 0)
    if (!force && record.signature === signature && (
        (record.status === 'clean' && age < 86400000) || record.status === 'infected' || (record.status === 'error' && age < 30000)
    )) return serialize(record)
    const claim = randomUUID()
    const lease = new Date(Date.now() - clamConfig().timeout - 45000)
    const claimed = await prisma.file_scans.updateMany({ where: { storage_key: key, user_id: userId, OR: [{ status: { not: 'scanning' } }, { updated_at: { lt: lease } }] }, data: { status: 'scanning', signature, claim, threat: null, message: null } })
    if (!claimed.count) return { status: 'scanning', threat: null, message: 'Scan in progress.', checkedAt: null }
    let result = await scanClamPath(path)
    if (signature !== await fileSignature(path).catch(() => 'missing')) result = { status: 'error', sha256: null, threat: null, message: 'The stored file changed during scanning. Access remains blocked.' }
    await prisma.file_scans.updateMany({ where: { storage_key: key, user_id: userId, claim }, data: { ...result, signature, checked_at: new Date(), claim: null } })
    const latest = await prisma.file_scans.findUnique({ where: { storage_key: key } })
    return latest ? serialize(latest) : unscanned()
}
export async function safeStoragePath(userId: string, key: string) {
    const state = await scanStoredFile(userId, key)
    requireCleanScan(state)
    return ownedPath(userId, key)
}

// Write transactions recheck the already-scanned immutable bytes without
// contacting ClamAV or opening another DB connection while user locks are held.
export async function assertCachedClean(userId: string, key: string, db: Prisma.TransactionClient) {
    const record = await db.file_scans.findFirst({ where: { storage_key: key, user_id: userId } })
    const path = await ownedPath(userId, key)
    if (!record || record.signature !== await fileSignature(path)) requireCleanScan(unscanned())
    requireCleanScan(record!)
    return path
}
export async function scanInboxFiles(userId: string, requestId: string, uploadIds: string[]) {
    const uploads = await prisma.request_uploads.findMany({ where: { id: { in: uploadIds }, request_id: requestId, request: { user_id: userId }, status: 'pending' } })
    if (uploads.length !== uploadIds.length || uploads.some(upload => !upload.storage_key)) throwError(404, 'Incoming file not found or already reviewed.')
    for (const upload of uploads) await safeStoragePath(userId, upload.storage_key!)
}
