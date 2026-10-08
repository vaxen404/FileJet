export const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return 'solar:file-bold'

    if (mimeType === 'application/pdf') {
        return 'solar:file-text-bold'
    }

    if (mimeType.startsWith('image/')) {
        return 'solar:gallery-bold'
    }

    if (mimeType.startsWith('video/')) {
        return 'solar:video-frame-bold'
    }

    if (mimeType.startsWith('audio/')) {
        return 'solar:music-note-bold'
    }

    if (mimeType === 'text/html') {
        return 'solar:code-file-bold'
    }

    if (
        mimeType === 'application/zip' ||
        mimeType === 'application/x-rar-compressed'
    ) {
        return 'solar:archive-bold'
    }

    return 'solar:file-bold'
}

export const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()

    return extension?.toUpperCase() ?? 'FILE'
}

export const getFileCategory = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (!extension) {
        return 'All'
    }

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
        return 'Images'
    }

    if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
        return 'Documents'
    }

    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
        return 'Videos'
    }

    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return 'Compressed'
    }

    return 'Others'
}

export const formatFileSize = (bytes: number | string) => {
    const size = Number(bytes)

    if (size === 0) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(1)} MB`
    }

    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export const formatFileTime = (date: string | null) => {
    if (!date) return ''

    return new Date(date).toLocaleDateString('tr-TR')
}