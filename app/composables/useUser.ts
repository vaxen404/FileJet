interface UserData {
    id: string
    username: string
    email: string
    storageLimit: number | string
    storageUsed: number | string
    createdAt: string | null
}

interface FileData {
    id: string
    user_id: string
    folder_id: string | null
    name: string
    original_name: string
    mime_type: string | null
    size: string
    storage_key: string
    created_at: string | null
    updated_at: string | null
}

interface FolderData {
    id: string
    user_id: string
    parent_folder_id: string | null
    name: string
    created_at: string | null
    updated_at: string | null
}

interface NoteData {
    id: string
    user_id: string
    folder_id: string | null
    title: string
    content: string
    size: string
    created_at: string | null
    updated_at: string | null
}

interface FavoriteData {
    id: string
    user_id: string
    file_id: string | null
    folder_id: string | null
    note_id: string | null
    created_at: string | null
    files: Omit<FileData, 'storage_key'> | null
    folders: FolderData | null
    notes: NoteData | null
}

interface TrashData {
    id: string
    user_id: string
    item_id: string
    item_type: string
    name: string | null
    original_name: string | null
    mime_type: string | null
    size: string | null
    storage_key: string | null
    folder_id: string | null
    parent_folder_id: string | null
    root_folder_id: string | null
    content: string | null
    deleted_at: string
}

interface FilesResponse {
    files: FileData[]
}

interface FoldersResponse {
    folders: FolderData[]
}

interface NotesResponse {
    notes: NoteData[]
}

interface FavoritesResponse {
    favorites: FavoriteData[]
}

export const useUser = () => {
    const requestFetch = useRequestFetch()
    const requestIds = useState<Record<string, number>>('user-request-ids', () => ({}))

    const user = useState<UserData | null>('user-data', () => null)
    const files = useState<FileData[]>('user-files', () => [])
    const folders = useState<FolderData[]>('user-folders', () => [])
    const notes = useState<NoteData[]>('user-notes', () => [])
    const favorites = useState<FavoriteData[]>('user-favorites', () => [])
    const trash = useState<TrashData[]>('user-trash', () => [])

    const pending = useState<boolean>('user-pending', () => false)
    const error = useState<string | null>('user-error', () => null)

    const fetchUser = async () => {
        try {
            const data = await requestFetch<UserData>('/api/users/@me')
            user.value = data
        } catch (err: any) {
            error.value = err.data?.message || err.message || 'Kullanıcı bilgileri alınamadı.'
        }
    }

    const fetchFiles = async () => {
        const requestId = (requestIds.value.files ?? 0) + 1
        requestIds.value.files = requestId

        try {
            const data = await requestFetch<FilesResponse>('/api/files')

            if (requestIds.value.files === requestId) {
                files.value = data.files
            }
        } catch (err: any) {
            if (requestIds.value.files !== requestId) return

            error.value = err.data?.message || err.message || 'Dosyalar alınamadı.'
        }
    }

    const fetchFolders = async () => {
        const requestId = (requestIds.value.folders ?? 0) + 1
        requestIds.value.folders = requestId

        try {
            const data = await requestFetch<FoldersResponse>('/api/folders')

            if (requestIds.value.folders === requestId) {
                folders.value = data.folders
            }
        } catch (err: any) {
            if (requestIds.value.folders !== requestId) return

            error.value = err.data?.message || err.message || 'Klasörler alınamadı.'
        }
    }

    const fetchNotes = async () => {
        const requestId = (requestIds.value.notes ?? 0) + 1
        requestIds.value.notes = requestId

        try {
            const data = await requestFetch<NotesResponse>('/api/notes')

            if (requestIds.value.notes === requestId) {
                notes.value = data.notes
            }
        } catch (err: any) {
            if (requestIds.value.notes !== requestId) return

            error.value = err.data?.message || err.message || 'Notlar alınamadı.'
        }
    }

    const fetchFavorites = async () => {
        const requestId = (requestIds.value.favorites ?? 0) + 1
        requestIds.value.favorites = requestId

        try {
            const data = await requestFetch<FavoritesResponse>('/api/favorites')

            if (requestIds.value.favorites === requestId) {
                favorites.value = data.favorites
            }
        } catch (err: any) {
            if (requestIds.value.favorites !== requestId) return

            error.value = err.data?.message || err.message || 'Favoriler alınamadı.'
        }
    }

    const fetchTrash = async () => {
        const requestId = (requestIds.value.trash ?? 0) + 1
        requestIds.value.trash = requestId

        try {
            const data = await requestFetch<{ items: TrashData[] }>('/api/trash')

            if (requestIds.value.trash === requestId) {
                trash.value = data.items
            }
        } catch (err: any) {
            if (requestIds.value.trash !== requestId) return

            error.value = err.data?.message || err.message || 'Trash items could not be loaded.'
        }
    }

    const syncTrash = async () => {
        error.value = null

        await Promise.all([
            fetchFiles(),
            fetchFolders(),
            fetchNotes(),
            fetchFavorites(),
            fetchTrash()
        ])
    }

    const fetchAll = async () => {
        pending.value = true
        error.value = null

        await Promise.all([
            fetchUser(),
            fetchFiles(),
            fetchFolders(),
            fetchNotes(),
            fetchFavorites()
        ])

        pending.value = false
    }

    return {
        user,
        files,
        folders,
        notes,
        favorites,
        trash,
        pending,
        error,
        fetchUser,
        fetchFiles,
        fetchFolders,
        fetchNotes,
        fetchFavorites,
        fetchTrash,
        syncTrash,
        fetchAll
    }
}
