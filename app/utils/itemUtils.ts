export const getFolderIcon = () => {
    return 'solar:folder-bold'
}

export const getNoteIcon = () => {
    return 'solar:notebook-bold'
}

export const formatItemTime = (date: string | null) => {
    if (!date) return ''

    return new Date(date).toLocaleDateString('tr-TR')
}

export const formatItemSize = (bytes: string | number) => {
    const size = Number(bytes)

    if (size === 0) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(1)} MB`
    }

    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}