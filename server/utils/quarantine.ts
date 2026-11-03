import { prisma } from './prisma'
import { throwError } from './error'
import { isUuid } from './validation'
import type { UploadManifest } from '../../shared/utils/resumableUpload'
import type { QuarantineEntry, QuarantinePage } from '../../shared/types/quarantine'

export function quarantineKey(id: string | undefined, userId: string) {
    if (!id || id.length > 1024 || !/^[\w-]+$/.test(id)) throwError(400, 'Invalid quarantine item.')
    const key = Buffer.from(id, 'base64url').toString('utf8')
    if (Buffer.from(key).toString('base64url') !== id || !key.startsWith(userId + '/')) throwError(404, 'Quarantine item not found.')
    return key
}
export function stagedReference(userId: string, key: string) {
    const match = new RegExp(`^${userId}/([0-9a-f-]{36})-(\\d+)$`, 'i').exec(key)
    return match && isUuid(match[1]!) && Number.isSafeInteger(Number(match[2])) ? { id: match[1]!, index: Number(match[2]) } : null
}
export async function ownedQuarantineRecord(userId: string, id: string | undefined) {
    const storage_key = quarantineKey(id, userId)
    const record = await prisma.file_scans.findFirst({ where: { storage_key, user_id: userId } })
    if (!record) throwError(404, 'Quarantine item not found.')
    return record
}
export async function listQuarantine(userId: string, status: 'infected' | 'error', cursor?: string): Promise<QuarantinePage> {
    const after = cursor ? quarantineKey(cursor, userId) : undefined
    const records = await prisma.file_scans.findMany({ where: { user_id: userId, status, ...(after ? { storage_key: { gt: after } } : {}) }, orderBy: { storage_key: 'asc' }, take: 51 })
    const page = records.slice(0, 50), keys = page.map(record => record.storage_key)
    const sessionIds = page.flatMap(record => { const ref = stagedReference(userId, record.storage_key); return ref ? [ref.id] : [] })
    const [files, versions, incoming, trash, sessions] = await Promise.all([
        prisma.files.findMany({ where: { user_id: userId, storage_key: { in: keys } } }),
        prisma.file_versions.findMany({ where: { user_id: userId, storage_key: { in: keys } } }),
        prisma.request_uploads.findMany({ where: { request: { user_id: userId }, status: 'pending', storage_key: { in: keys } }, include: { request: { select: { title: true } } } }),
        prisma.trash.findMany({ where: { user_id: userId, item_type: 'file', storage_key: { in: keys } } }),
        prisma.upload_sessions.findMany({ where: { user_id: userId, id: { in: sessionIds } } })
    ])
    const items: QuarantineEntry[] = []
    for (const record of page) {
        const id = Buffer.from(record.storage_key).toString('base64url')
        const base = { id, status: record.status as 'infected' | 'error', threat: record.threat, message: record.message, checkedAt: record.checked_at?.toISOString() ?? null }
        const file = files.find(row => row.storage_key === record.storage_key)
        const version = versions.find(row => row.storage_key === record.storage_key)
        const inbox = incoming.find(row => row.storage_key === record.storage_key)
        const deleted = trash.find(row => row.storage_key === record.storage_key)
        if (file) items.push({ ...base, name: file.original_name, kind: 'file', location: 'Files', size: file.size.toString(), href: `/files/${file.id}`, deleteUrl: `/api/files/${file.id}`, deleteLabel: 'Move to trash' })
        else if (version) items.push({ ...base, name: version.name, kind: 'version', location: `Saved version v${version.revision}`, size: version.size.toString(), href: files.some(row => row.id === version.file_id) ? `/files/${version.file_id}` : null, deleteUrl: `/api/files/${version.file_id}/versions/${version.id}`, deleteLabel: 'Delete version' })
        else if (inbox) items.push({ ...base, name: inbox.name, kind: 'inbox', location: `Inbox · ${inbox.request.title}`, size: inbox.size.toString(), href: `/inbox/${inbox.request_id}`, deleteUrl: `/api/inbox/${inbox.request_id}/uploads/${inbox.id}/reject`, deleteLabel: 'Reject file' })
        else if (deleted) items.push({ ...base, name: deleted.original_name ?? deleted.name ?? 'Deleted file', kind: 'trash', location: 'Trash', size: (deleted.size ?? 0n).toString(), href: '/trash', deleteUrl: `/api/trash/${deleted.id}`, deleteLabel: 'Delete permanently' })
        else {
            const ref = stagedReference(userId, record.storage_key), session = sessions.find(row => row.id === ref?.id && !row.result)
            const manifest = session?.manifest as unknown as UploadManifest | undefined
            const part = ref && manifest?.files[ref.index]
            if (part) items.push({ ...base, name: part.name, kind: 'upload', location: 'Blocked unfinished upload', size: String(part.size), href: null, deleteUrl: `/api/quarantine/${id}`, deleteLabel: 'Discard upload' })
        }
    }
    return { items, nextCursor: records.length > 50 ? Buffer.from(page.at(-1)!.storage_key).toString('base64url') : null }
}
