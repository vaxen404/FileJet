export const getItemIcon = (item: any) => {
    return item.file_id
        ? 'solar:file-bold'
        : item.folder_id
            ? 'solar:folder-bold'
            : 'solar:notebook-bold'
}

export const getItemName = (item: any) => {
    return item.file_id
        ? item.files.name
        : item.folder_id
            ? item.folders.name
            : item.notes.title
}

export const getItemType = (item: any) => {
    return item.file_id
        ? 'file'
        : item.folder_id
            ? 'folder'
            : 'note'
}

export const getItemId = (item: any) => {
    return item.file_id 
        ? item.file_id
        : item.folder_id
            ? item.folder_id
            : item.note_id
}

export const getItemActions = (item: any) => {
    const type = getItemType(item)

    if (type === 'file') {
        return ['open', 'rename', 'download', 'delete'] as const
    }

    if (type === 'folder') {
        return ['open', 'rename', 'delete'] as const
    }

    return ['open', 'edit', 'favorite', 'delete'] as const
}

export const formatTime = (date: string | null) => {
    if (!date) return ''

    return new Date(date).toLocaleDateString('tr-TR')
}
