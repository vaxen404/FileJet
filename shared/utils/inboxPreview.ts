export type InboxPreviewKind = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'unsupported'

const images = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon'])
const videos = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])
const audio = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/x-flac'])
const textTypes = new Set(['application/json', 'application/xml', 'application/javascript', 'application/x-javascript', 'application/yaml', 'application/x-yaml', 'image/svg+xml'])
const textExtensions = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'xml', 'yaml', 'yml', 'js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'scss', 'html', 'htm', 'svg', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'sh', 'ini', 'toml'])

export function getInboxPreview(name: string, mimeType: string | null): { kind: InboxPreviewKind; contentType: string } {
    const mime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? ''
    const extension = name.toLowerCase().split('.').pop() ?? ''
    if (images.has(mime)) return { kind: 'image', contentType: mime }
    if (mime === 'application/pdf') return { kind: 'pdf', contentType: mime }
    if (videos.has(mime)) return { kind: 'video', contentType: mime }
    if (audio.has(mime)) return { kind: 'audio', contentType: mime }
    // HTML, SVG and code are always displayed as escaped text, never as documents.
    if (mime.startsWith('text/') || textTypes.has(mime) || ((!mime || mime === 'application/octet-stream') && textExtensions.has(extension)))
        return { kind: 'text', contentType: 'text/plain; charset=utf-8' }
    return { kind: 'unsupported', contentType: 'application/octet-stream' }
}

export function inboxPreviewRange(value: string, size: number): { start: number; end: number } | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(value)
    if (!match || (!match[1] && !match[2]) || size < 1) return null
    const suffix = match[1] === ''
    const first = Number(match[1]), last = Number(match[2])
    if ((match[1] && !Number.isSafeInteger(first)) || (match[2] && !Number.isSafeInteger(last)) || (suffix && last < 1)) return null
    const start = suffix ? Math.max(0, size - last) : first
    const end = suffix ? size - 1 : match[2] ? Math.min(last, size - 1) : size - 1
    return start >= size || start > end ? null : { start, end }
}
