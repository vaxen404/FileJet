import { reactive } from 'vue'
import { UPLOAD_CHUNK_SIZE, UPLOAD_LIFETIME, parseUploadManifest, type UploadKind, type UploadManifest, type UploadSessionView } from '~~/shared/utils/resumableUpload'
import { parseSender } from '~~/shared/utils/sender'
export interface UploadJob { scope: string; label: string; state: 'preparing' | 'uploading' | 'waiting' | 'finishing' | 'failed'; progress: number }
export const uploadJobs = reactive(new Map<string, UploadJob>())
interface ResumeRecord { id: string; key: string; expiresAt: number; label: string }
interface UploadOptions {
    kind: UploadKind; scope: string; label: string; folderId?: string | null; requestToken?: string
    senderName?: string; senderNote?: string; signal?: AbortSignal
    onProgress?: (loaded: number, total: number, finishing: boolean) => void
}
const prefix = (scope: string) => `filejet:upload:${scope}:`
const changed = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('filejet:uploads')) }
function stored(key: string): ResumeRecord | null {
    try {
        const item = JSON.parse(localStorage.getItem(key) ?? 'null')
        if (item && typeof item.id === 'string' && typeof item.key === 'string' && typeof item.label === 'string' && Number.isFinite(item.expiresAt) && item.expiresAt > Date.now()) return item
        localStorage.removeItem(key)
    } catch { /* Resuming in this tab still works without persistent storage. */ }
    return null
}
function save(key: string, value: ResumeRecord | null) {
    try { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key) } catch { /* Optional browser persistence. */ }
    changed()
}
export function unfinishedUploadCount(scope: string) {
    try { return Object.keys(localStorage).filter(key => key.startsWith(prefix(scope)) && stored(key)).length } catch { return 0 }
}
export async function discardUnfinishedUploads(scope: string) {
    let keys: string[] = []
    try { keys = Object.keys(localStorage).filter(key => key.startsWith(prefix(scope))) } catch { return }
    for (const key of keys) {
        const record = stored(key)
        if (!record) continue
        const response = await fetch(`/api/uploads/${record.id}`, { method: 'DELETE', credentials: 'same-origin', headers: { 'Upload-Key': record.key } })
        if (!response.ok && ![404, 410].includes(response.status)) throw new Error('Could not discard the unfinished upload. Please try again.')
        save(key, null)
    }
}
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('')
async function hash(value: Blob | string) { return hex(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : await value.arrayBuffer())) }
function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        signal?.throwIfAborted()
        const finish = () => { signal?.removeEventListener('abort', abort); resolve() }
        const timer = setTimeout(finish, ms)
        const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal?.reason) }
        signal?.addEventListener('abort', abort, { once: true })
    })
}
async function online(signal?: AbortSignal) {
    if (typeof navigator === 'undefined' || navigator.onLine) return
    await new Promise<void>((resolve, reject) => {
        signal?.throwIfAborted()
        const cleanup = () => { window.removeEventListener('online', ready); signal?.removeEventListener('abort', abort) }
        const ready = () => { cleanup(); resolve() }
        const abort = () => { cleanup(); reject(signal?.reason) }
        window.addEventListener('online', ready, { once: true }); signal?.addEventListener('abort', abort, { once: true })
        if (navigator.onLine) ready()
    })
}
export async function uploadResumably(files: File[], options: UploadOptions): Promise<Record<string, unknown>> {
    const jobId = crypto.randomUUID(), total = files.reduce((sum, file) => sum + file.size, 0)
    const job: UploadJob = { scope: options.scope, label: options.label, state: 'preparing', progress: 0 }
    const update = (state: UploadJob['state'], loaded = 0) => {
        job.state = state; job.progress = total ? Math.floor(loaded / total * 100) : 0
        uploadJobs.set(jobId, { ...job })
        options.onProgress?.(loaded, total, state === 'finishing')
    }
    update('preparing')
    let storageKey = '', record: ResumeRecord | null = null
    const request = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
        for (let attempt = 0; ; attempt++) {
            options.signal?.throwIfAborted()
            if (typeof navigator !== 'undefined' && !navigator.onLine) { update('waiting', job.progress * total / 100); await online(options.signal) }
            try {
                const response = await fetch(url, { ...init, credentials: 'same-origin', headers: { Accept: 'application/json', 'Upload-Key': record!.key, ...init.headers }, signal: AbortSignal.any([AbortSignal.timeout(90000), ...(options.signal ? [options.signal] : [])]) })
                const body = await response.json()
                if (response.ok) return body as T
                const error = Object.assign(new Error(body.message || body.statusMessage || 'Could not upload files.'), { status: response.status, retryAfter: Number(response.headers.get('Retry-After') || 0) })
                throw error
            } catch (error) {
                options.signal?.throwIfAborted()
                const status = (error as { status?: number }).status
                if (status && ![408, 429, 500, 502, 503, 504].includes(status)) throw error
                if (attempt >= 4) throw new Error('Connection interrupted. Select the same files and destination to resume your upload within 24 hours.')
                update('waiting', job.progress * total / 100)
                await delay(Math.max(1000 * 2 ** attempt, Math.min(60, (error as { retryAfter?: number }).retryAfter || 0) * 1000), options.signal)
            }
        }
    }
    try {
        const manifest: UploadManifest = { kind: options.kind, folderId: options.folderId ?? null, requestToken: options.requestToken, ...parseSender(options), files: [] }
        for (const file of files) {
            const hashes: string[] = []
            for (let offset = 0; offset < file.size; offset += UPLOAD_CHUNK_SIZE) {
                options.signal?.throwIfAborted()
                hashes.push(await hash(file.slice(offset, offset + UPLOAD_CHUNK_SIZE)))
            }
            manifest.files.push({ name: file.name, size: file.size, type: file.type, path: options.kind === 'folders' ? file.webkitRelativePath || file.name : file.name, hashes })
        }
        parseUploadManifest(manifest)
        storageKey = prefix(options.scope) + await hash(JSON.stringify(manifest))
        record = stored(storageKey)
        if (!record) { record = { id: crypto.randomUUID(), key: crypto.randomUUID() + crypto.randomUUID(), expiresAt: Date.now() + UPLOAD_LIFETIME, label: options.label }; save(storageKey, record) }
        let view: UploadSessionView
        try {
            view = await request<UploadSessionView>('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id, ...manifest }) })
        } catch (error) {
            if ((error as { status?: number }).status === 410 && record.expiresAt <= Date.now()) save(storageKey, null)
            throw error
        }
        record.expiresAt = Date.parse(view.expiresAt); save(storageKey, record)
        if (view.completed && view.result) { save(storageKey, null); return view.result }
        for (const [index, file] of files.entries()) {
            let offset = view.offsets[index]!
            while (offset < file.size) {
                update('uploading', view.offsets.reduce((sum, value) => sum + value, 0))
                view = await request<UploadSessionView>(`/api/uploads/${record.id}/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body: file.slice(offset, offset + UPLOAD_CHUNK_SIZE) })
                offset = view.offsets[index]!
            }
        }
        update('finishing', total)
        const result = await request<Record<string, unknown>>(`/api/uploads/${record.id}/complete`, { method: 'POST' })
        save(storageKey, null)
        return result
    } catch (error) { update('failed', job.progress * total / 100); throw error }
    finally { uploadJobs.delete(jobId); changed() }
}
