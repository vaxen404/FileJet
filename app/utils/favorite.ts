export const getItemIcon = (item: any) => {
    if (item.file_id) return 'solar:file-bold'
    if (item.folder_id) return 'solar:folder-bold'
    return 'solar:notebook-bold'
}

export const getItemName = (item: any) => {
    if (item.file_id) return item.files.name
    if (item.folder_id) return item.folders.name
    return item.notes.title
}

export const getItemType = (item: any): 'file' | 'folder' | 'note' => {
    if (item.file_id) return 'file'
    if (item.folder_id) return 'folder'
    return 'note'
}

export const getItemId = (item: any): string => {
    if (item.file_id) return item.file_id
    if (item.folder_id) return item.folder_id
    return item.note_id
}

export const getItemActions = (item: any) => {
    const type = getItemType(item)

    if (type !== 'note') {
        return ['open', 'rename', 'download', 'favorite', 'delete'] as const
    }

    return ['open', 'edit', 'rename', 'download', 'favorite', 'delete'] as const
}

export const formatTime = (date: string | null) => {
    if (!date) return ''

    return new Date(date).toLocaleDateString('tr-TR')
}
