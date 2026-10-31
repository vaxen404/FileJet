export const UPLOAD_CHUNK_SIZE = 1024 * 1024
export const UPLOAD_LIFETIME = 24 * 60 * 60 * 1000
export interface UploadFileManifest { name: string; type: string; size: number; path: string; hashes: string[] }
export type UploadKind = 'files' | 'folders' | 'notes' | 'inbox'
export interface UploadManifest { kind: UploadKind; folderId: string | null; requestToken?: string; replaceFileId?: string; expectedRevision?: number; senderName: string; senderNote: string; files: UploadFileManifest[] }
export interface UploadSessionView { id: string; offsets: number[]; expiresAt: string; completed: boolean; result: Record<string, unknown> | null }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function parseUploadManifest(value: unknown): UploadManifest {
    const fail = (message: string): never => { throw new Error(message) }
    if (!value || typeof value !== 'object') return fail('Invalid upload.')
    const body = value as Record<string, unknown>
    if (!['files', 'folders', 'notes', 'inbox'].includes(String(body.kind))) fail('Invalid upload destination.')
    const kind = body.kind as UploadKind, folderId = body.folderId == null ? null : body.folderId
    if (folderId !== null && (typeof folderId !== 'string' || !uuid.test(folderId))) fail('Invalid destination folder.')
    if (kind === 'inbox' && (typeof body.requestToken !== 'string' || !uuid.test(body.requestToken))) fail('Invalid inbox link.')
    const files = body.files as UploadFileManifest[]
    const maxFiles = kind === 'folders' ? 2000 : kind === 'notes' ? 10 : 6
    if (!Array.isArray(files) || !files.length || files.length > maxFiles) fail(`Choose between 1 and ${maxFiles} files.`)
    if (body.replaceFileId !== undefined && (kind !== 'files' || files.length !== 1 || typeof body.replaceFileId !== 'string' || !uuid.test(body.replaceFileId) || !Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1)) fail('Invalid file version target.')
    const names = new Set<string>()
    let total = 0
    for (const file of files) {
        if (!file || typeof file.name !== 'string' || !file.name || /[/\\\0\r\n]/.test(file.name) || ['.', '..'].includes(file.name) || new TextEncoder().encode(file.name).length > 255) fail('Invalid filename.')
        if (typeof file.type !== 'string' || file.type.length > 150 || /[\r\n\0]/.test(file.type)) fail('Invalid file type.')
        if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > 1024 ** 3) fail('Each file must be 1 GB or smaller.')
        if (!Array.isArray(file.hashes) || file.hashes.length !== Math.ceil(file.size / UPLOAD_CHUNK_SIZE) || file.hashes.some(hash => typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))) fail('Invalid file checksums.')
        if (typeof file.path !== 'string') fail('Invalid file path.')
        if (kind === 'folders') {
            const segments = file.path.split('/')
            if (segments.length < 2 || segments.length > 20 || segments.at(-1) !== file.name || segments.some(segment => !segment || ['.', '..'].includes(segment) || /[\\\0:\r\n]/.test(segment) || new TextEncoder().encode(segment).length > 255)) fail('Invalid folder path.')
        } else if (file.path !== file.name) fail('Invalid file path.')
        if (kind === 'notes' && (file.size > 5 * 1024 ** 2 || !/\.(txt|md)$/i.test(file.name) || !['', 'text/plain', 'text/markdown', 'text/x-markdown', 'application/octet-stream'].includes(file.type))) fail('Notes must be UTF-8 TXT or MD files up to 5 MB.')
        const name = (kind === 'folders' ? file.path : file.name).toLowerCase()
        if (kind !== 'inbox' && names.has(name)) fail('Duplicate file name or path in upload.')
        names.add(name); total += file.size
    }
    if (total > (kind === 'inbox' ? 50 * 1024 ** 2 : 1024 ** 3)) fail(kind === 'inbox' ? 'Upload up to 50 MB at a time.' : 'Upload up to 1 GB at a time.')
    return { kind, folderId: folderId as string | null, requestToken: kind === 'inbox' ? body.requestToken as string : undefined, ...(body.replaceFileId ? { replaceFileId: body.replaceFileId as string, expectedRevision: body.expectedRevision as number } : {}), senderName: '', senderNote: '', files: files.map(file => ({ name: file.name, path: file.path, type: file.type, size: file.size, hashes: file.hashes })) }
}
