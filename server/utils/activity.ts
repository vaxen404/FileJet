import { createHash } from 'node:crypto'
import { getHeader, getRequestURL, readBody, type H3Event } from 'h3'
import { prisma } from './prisma'
import { getAuthSession } from './auth'
import { isUuid } from './validation'
import type { ActivityAction, ActivityKind } from '../../shared/types/activity'
import type { UploadManifest } from '../../shared/utils/resumableUpload'
import { ownedQuarantineRecord, stagedReference } from './quarantine'

interface Target { id: string | null; type: ActivityKind; name: string; folderId?: string | null; fingerprint?: string; key?: string }
interface Capture { owner: string; path: string; action: ActivityAction; targets: Target[]; lookup?: { type: ActivityKind; id: string }; upload?: { id: string; createdAt: string; manifest: UploadManifest }; create?: ActivityKind }
const kind = (plural: string): ActivityKind => ({ files: 'file', folders: 'folder', notes: 'note' })[plural] as ActivityKind
const digest = (title: string, content: string) => createHash('sha256').update(JSON.stringify([title, content])).digest('hex')
const validIds = (values: unknown): string[] => Array.isArray(values) ? values.filter((id): id is string => typeof id === 'string' && isUuid(id)).slice(0,200) : []
export async function activityTargets(owner: string, type: ActivityKind, ids: string[]): Promise<Target[]> {
    if (!ids.length) return []
    const where = { user_id: owner, id: { in: ids } }
    if (type === 'file') return (await prisma.files.findMany({ where, select: { id: true, original_name: true, folder_id: true } })).map(row => ({ id: row.id, type, name: row.original_name, folderId: row.folder_id }))
    if (type === 'folder') return (await prisma.folders.findMany({ where, select: { id: true, name: true, parent_folder_id: true } })).map(row => ({ id: row.id, type, name: row.name, folderId: row.parent_folder_id }))
    if (type === 'note') return (await prisma.notes.findMany({ where })).map(row => ({ id: row.id, type, name: row.title, folderId: row.folder_id, fingerprint: digest(row.title,row.content) }))
    if (type === 'inbox') return (await prisma.file_requests.findMany({ where, select: { id: true, title: true } })).map(row => ({ id: row.id, type, name: row.title }))
    return []
}
export async function captureActivity(event: H3Event): Promise<Capture | null> {
    const method = event.method, path = getRequestURL(event).pathname.replace(/\/$/,'')
    if (!['POST','PATCH','DELETE'].includes(method) || !path.startsWith('/api/')) return null
    let owner = getAuthSession(event)?.userId
    const completed = /^\/api\/uploads\/([0-9a-f-]{36})\/complete$/i.exec(path)
    if (completed) {
        const upload = await prisma.upload_sessions.findFirst({ where: { id: completed[1] } })
        if (!upload || upload.result || (!upload.request_id && upload.user_id !== owner)) return null
        const manifest = upload.manifest as unknown as UploadManifest
        // The downstream completion handler still validates the Upload-Key.
        return { owner: upload.user_id, path, targets: [], action: manifest.replaceFileId ? 'version_added' : 'uploaded', upload: { id: upload.id, createdAt: upload.created_at.toISOString(), manifest } }
    }
    if (!owner) return null
    const base = { owner, path, targets: [] as Target[] }
    let match: RegExpExecArray | null
    if ((match = /^\/api\/(files|folders|notes)\/([0-9a-f-]{36})$/i.exec(path))) {
        const type = kind(match[1]!), id = match[2]!
        return { ...base, action: method === 'DELETE' ? 'trashed' : type === 'note' ? 'updated' : 'renamed', targets: await activityTargets(owner,type,[id]) }
    }
    if ((match = /^\/api\/files\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})(?:\/(restore))?$/i.exec(path))) return { ...base, action: match[3] ? 'version_restored' : 'version_deleted', targets: await activityTargets(owner,'file',[match[1]!]) }
    if ((match = /^\/api\/notes\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})(?:\/(restore))?$/i.exec(path))) return { ...base, action: match[3] ? 'version_restored' : 'version_deleted', targets: await activityTargets(owner,'note',[match[1]!]) }
    if ((match = /^\/api\/files\/([0-9a-f-]{36})\/scan$/i.exec(path))) return { ...base, action: 'scanned', targets: await activityTargets(owner,'file',[match[1]!]) }
    if ((match = /^\/api\/items\/(file|folder|note)\/([0-9a-f-]{36})\/tags$/i.exec(path))) return { ...base, action: 'tags_updated', targets: await activityTargets(owner,match[1] as ActivityKind,[match[2]!]) }
    if ((match = /^\/api\/shared\/items\/(file|folder|note)\/([0-9a-f-]{36})$/i.exec(path))) return { ...base, action: method === 'DELETE' ? 'unshared' : 'share_updated', targets: await activityTargets(owner,match[1] as ActivityKind,[match[2]!]) }
    if ((match = /^\/api\/trash\/([0-9a-f-]{36}|bulk-restore|bulk-delete)$/i.exec(path))) {
        const ids = isUuid(match[1]!) ? [match[1]!] : validIds((await readBody(event))?.itemIds)
        const trash = await prisma.trash.findMany({ where: { user_id: owner, id: { in: ids } } })
        return { ...base, action: method === 'PATCH' || match[1] === 'bulk-restore' ? 'restored' : 'deleted', targets: trash.map(row => ({ id: row.item_id, type: row.item_type as ActivityKind, name: row.original_name ?? row.name ?? 'Deleted item' })) }
    }
    if ((match = /^\/api\/(files|folders|notes)\/bulk-delete$/.exec(path))) {
        const body = await readBody(event), type = kind(match[1]!)
        return { ...base, action: 'trashed', targets: await activityTargets(owner,type,validIds(body?.fileIds ?? body?.ids)) }
    }
    if (path === '/api/items/move' && method === 'POST') {
        const body = await readBody(event), selected = Array.isArray(body?.items) ? body.items.slice(0,200) : []
        const targets = (await Promise.all((['file','folder','note'] as const).map(type => activityTargets(owner,type,validIds(selected.filter((item: any) => item?.type === type).map((item: any) => item.id)))))).flat()
        return { ...base, action: 'moved', targets }
    }
    if ((match = /^\/api\/quarantine\/([\w-]+)(\/scan)?$/.exec(path))) {
        const record = await ownedQuarantineRecord(owner,match[1])
        const file = await prisma.files.findFirst({ where: { user_id: owner, storage_key: record.storage_key }, select: { id: true, original_name: true } })
        const version = !file && await prisma.file_versions.findFirst({ where: { user_id: owner, storage_key: record.storage_key } })
        const incoming = !file && !version && await prisma.request_uploads.findFirst({ where: { request: { user_id: owner }, storage_key: record.storage_key } })
        const deleted = !file && !version && !incoming && await prisma.trash.findFirst({ where: { user_id: owner, storage_key: record.storage_key } })
        let target: Target = file ? { id: file.id, type: 'file', name: file.original_name } : version ? { id: version.file_id, type: 'file', name: version.name } : incoming ? { id: incoming.request_id, type: 'inbox', name: incoming.name } : deleted ? { id: deleted.item_id, type: 'file', name: deleted.original_name ?? deleted.name ?? 'Deleted file' } : { id: null, type: 'batch', name: 'Blocked upload' }
        if (!file && !version && !incoming && !deleted) {
            const ref = stagedReference(owner,record.storage_key), session = ref && await prisma.upload_sessions.findFirst({ where: { user_id: owner, id: ref.id } })
            const manifest = session && session.manifest as unknown as UploadManifest
            if (ref && manifest) target.name = manifest.files[ref.index]?.name ?? target.name
        }
        return { ...base, action: match[2] ? 'scanned' : 'discarded', targets: [target] }
    }
    if (path === '/api/notes/offline-sync') {
        const body = await readBody(event)
        if (!isUuid(body?.id)) return null
        const targets = await activityTargets(owner,'note',[body.id])
        if (targets[0]?.fingerprint === digest(body.title,body.content)) return null
        return { ...base, action: targets.length ? 'updated' : 'created', targets, lookup: { type: 'note', id: body.id } }
    }
    if ((match = /^\/api\/inbox\/([0-9a-f-]{36})\/uploads\/([0-9a-f-]{36})\/(approve|reject)$/i.exec(path))) {
        const upload = await prisma.request_uploads.findFirst({ where: { id: match[2], request_id: match[1], request: { user_id: owner } } })
        return { ...base, action: match[3] === 'approve' ? 'approved' : 'rejected', targets: upload ? [{ id: match[1]!, type: 'inbox', name: upload.name }] : [] }
    }
    if ((match = /^\/api\/inbox\/([0-9a-f-]{36})$/i.exec(path))) return { ...base, action: method === 'DELETE' ? 'deleted' : 'updated', targets: await activityTargets(owner,'inbox',[match[1]!]) }
    if (path === '/api/inbox' && method === 'POST') {
        const body = await readBody(event)
        return { ...base, action: 'created', targets: [{ id: null, type: 'inbox', name: typeof body?.title === 'string' ? body.title : 'Inbox' }] }
    }
    if (path === '/api/shared' && method === 'POST') return { ...base, action: 'shared' } // Bounded share reader supplies only the target ID.
    if ((match = /^\/api\/(files|folders|notes)(\/upload)?$/.exec(path)) && method === 'POST') {
        const multipart = !getHeader(event,'content-type')?.includes('application/json')
        return { ...base, action: multipart ? 'uploaded' : 'created', create: kind(match[1]!) }
    }
    return null
}

export async function finishActivity(capture: Capture, result: any, shareTarget?: { itemType: ActivityKind; itemId: string }) {
    let targets = capture.targets, action = capture.action
    const { owner } = capture
    if (capture.create) {
        const rows = result?.files ?? result?.notes ?? (result?.folder ? [result.folder] : result?.note ? [result.note] : [])
        targets = Array.isArray(rows) ? rows.slice(0,200).flatMap((row: any) => isUuid(row?.id) ? [{ id: row.id, type: capture.create!, name: String(row.original_name ?? row.title ?? row.name ?? 'Uploaded item') }] : []) : []
        if (!targets.length && Number(result?.filesUploaded) > 0) targets = [{ id: null, type: 'batch', name: `${result.filesUploaded} uploaded files` }]
    }
    if (capture.upload) {
        const { id, createdAt, manifest } = capture.upload
        if (manifest.replaceFileId) targets = await activityTargets(owner,'file',[manifest.replaceFileId])
        else if (manifest.files.length > 200) targets = [{ id: null, type: 'batch', name: `${manifest.files.length} uploaded items` }]
        else {
            const files = await prisma.files.findMany({ where: { user_id: owner, storage_key: { in: manifest.files.map((_,index) => `${owner}/${id}-${index}`) } }, select: { id: true, storage_key: true } })
            targets = manifest.files.map((file,index) => ({ id: files.find(row => row.storage_key === `${owner}/${id}-${index}`)?.id ?? null, type: manifest.kind === 'notes' ? 'note' : manifest.kind === 'inbox' ? 'inbox' : 'file', name: file.name }))
        }
        targets = targets.map((target,index) => ({ ...target, key: `upload:${id}:${createdAt}:${index}` }))
    }
    if (capture.lookup) {
        const latest = await activityTargets(owner,capture.lookup.type,[capture.lookup.id])
        if (latest[0]) targets = [{ ...latest[0], name: latest[0].name }]
    }
    if (shareTarget && capture.action === 'shared') targets = await activityTargets(owner,shareTarget.itemType,[shareTarget.itemId])
    if (action === 'scanned') action = result?.status === 'infected' ? 'quarantined' : result?.status === 'clean' ? 'scanned' : 'scan_failed'
    const entries = []
    for (const target of targets) {
        let name = target.name, previous: string | null = null, location: string | null = null
        if (['renamed','updated','moved'].includes(action) && target.id && !capture.lookup) {
            const current = (await activityTargets(owner,target.type,[target.id]))[0]
            if (current) {
                if (action === 'moved' && current.folderId === target.folderId) continue
                if (action === 'updated' && target.fingerprint && current.fingerprint === target.fingerprint) continue
                name = current.name
                if (name !== target.name) previous = target.name
                if (action === 'moved') location = current.folderId ? (await prisma.folders.findFirst({ where: { id: current.folderId, user_id: owner }, select: { name: true } }))?.name ?? 'Folder' : 'Root'
            }
        }
        entries.push({ user_id: owner, item_id: target.id, item_type: target.type, action, name: name.slice(0,255), previous_name: previous?.slice(0,255), location, request_key: target.key })
    }
    if (entries.length) await prisma.activity_entries.createMany({ data: entries, skipDuplicates: true })
}
