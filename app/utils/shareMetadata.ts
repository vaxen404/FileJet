export interface SocialShareItem {
    type: 'file' | 'folder' | 'note'
    isPasswordProtected: boolean
    item: {
        name?: string
        original_name?: string | null
        title?: string
        mime_type?: string | null
        size?: string | null
    }
}

const supportedImages = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
type ImageMime = typeof supportedImages[number]
const isSupportedImage = (mime: string): mime is ImageMime => supportedImages.some(value => value === mime)

const readableSize = (value: string | null | undefined) => {
    const bytes = Number(value)
    if (!value || !Number.isFinite(bytes) || bytes < 0) return ''
    const unit = Math.min(3, Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024)))
    const amount = bytes / 1024 ** unit
    return `${Number(amount.toFixed(unit ? 1 : 0))} ${['B', 'KB', 'MB', 'GB'][unit]}`
}

export function createShareMetadata(input: {
    origin: string
    token: string
    share: SocialShareItem | null | undefined
    passwordRequired?: boolean
    unavailable?: boolean
}) {
    const url = new URL(`/shared/${encodeURIComponent(input.token)}`, input.origin).href
    const base = {
        url,
        title: 'Shared with FileJet',
        description: 'Open this link to view a file, folder, or note shared with FileJet.',
        image: undefined as string | undefined,
        imageType: undefined as ImageMime | undefined,
        imageAlt: undefined as string | undefined,
        card: 'summary' as 'summary' | 'summary_large_image'
    }

    // Even an unlocked visitor must not publish protected content into social metadata.
    if (input.passwordRequired || input.share?.isPasswordProtected) {
        return { ...base, title: 'Password-protected share · FileJet', description: 'Enter the link password to access this shared item.' }
    }
    if (input.unavailable) {
        return { ...base, title: 'Share unavailable · FileJet', description: 'This share link is invalid, expired, or no longer available.' }
    }
    if (!input.share) return base

    const { type, item } = input.share
    const name = (type === 'note' ? item.title : item.original_name || item.name)
        ?.replace(/\s+/g, ' ').trim().slice(0, 240)
    const mime = item.mime_type?.toLowerCase() ?? ''
    const kind = type === 'folder' ? 'Folder' : type === 'note' ? 'Note'
        : isSupportedImage(mime) ? 'Image' : mime.startsWith('video/') ? 'Video'
        : mime === 'application/pdf' ? 'PDF' : 'File'
    const size = type === 'folder' ? '' : readableSize(item.size)
    const metadata = {
        ...base,
        title: name || `Shared ${type} · FileJet`,
        description: [kind, size, 'Shared with FileJet'].filter(Boolean).join(' · ')
    }

    if (type === 'file' && isSupportedImage(mime)) {
        metadata.image = new URL(`/api/shared/${encodeURIComponent(input.token)}/preview`, input.origin).href
        metadata.imageType = mime
        metadata.imageAlt = name || 'Shared image'
        metadata.card = 'summary_large_image'
    }
    return metadata
}
