import type { StorageCategory, StorageUsage } from '../../shared/types/storage'

const documentMimes = new Set([
    'application/pdf', 'application/msword', 'application/rtf',
    'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'application/json', 'application/xml', 'application/yaml', 'application/x-yaml'
])

export function getStorageCategory(mimeType: string | null): StorageCategory {
    const mime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? ''
    if (mime.startsWith('image/')) return 'images'
    if (mime.startsWith('video/')) return 'videos'
    if (mime.startsWith('text/') || documentMimes.has(mime)
        || mime.startsWith('application/vnd.openxmlformats-officedocument.')
        || mime.startsWith('application/vnd.oasis.opendocument.')) return 'documents'
    return 'others'
}

interface SizeGroup {
    mime_type: string | null
    _sum: { size: bigint | null }
}

export function summarizeStorageUsage(input: {
    limit: bigint | null
    files: SizeGroup[]
    notes: bigint | null
    trash: (SizeGroup & { item_type: string })[]
}): StorageUsage {
    const categories = { images: 0n, documents: input.notes ?? 0n, videos: 0n, others: 0n }
    for (const file of input.files) categories[getStorageCategory(file.mime_type)] += file._sum.size ?? 0n
    for (const item of input.trash) {
        if (item.item_type === 'note') categories.documents += item._sum.size ?? 0n
        else if (item.item_type === 'file') categories[getStorageCategory(item.mime_type)] += item._sum.size ?? 0n
    }
    return {
        storageUsed: (categories.images + categories.documents + categories.videos + categories.others).toString(),
        storageLimit: (input.limit ?? 0n).toString(),
        categories: {
            images: categories.images.toString(), documents: categories.documents.toString(),
            videos: categories.videos.toString(), others: categories.others.toString()
        }
    }
}
