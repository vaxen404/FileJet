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

interface FilesResponse {
    files: FileData[]
}

interface FoldersResponse {
    folders: FolderData[]
}

interface NotesResponse {
    notes: NoteData[]
}

export const useUser = () => {
    const user = useState<UserData | null>('user-data', () => null)
    const files = useState<FileData[]>('user-files', () => [])
    const folders = useState<FolderData[]>('user-folders', () => [])
    const notes = useState<NoteData[]>('user-notes', () => [])

    const pending = useState<boolean>('user-pending', () => false)
    const error = useState<string | null>('user-error', () => null)

    const fetchUser = async () => {
        try {
            const data = await $fetch<UserData>('/api/users/@me')
            user.value = data
        } catch (err: any) {
            error.value = err.data?.message || 'Kullanıcı bilgileri alınamadı.'
        }
    }

    const fetchFiles = async () => {
        try {
            const data = await $fetch<FilesResponse>('/api/files')
            files.value = data.files
        } catch (err: any) {
            error.value = err.data?.message || 'Dosyalar alınamadı.'
        }
    }

    const fetchFolders = async () => {
        try {
            const data = await $fetch<FoldersResponse>('/api/folders')
            folders.value = data.folders
        } catch (err: any) {
            error.value = err.data?.message || 'Klasörler alınamadı.'
        }
    }

    const fetchNotes = async () => {
        try {
            const data = await $fetch<NotesResponse>('/api/notes')
            notes.value = data.notes
        } catch (err: any) {
            error.value = err.data?.message || 'Notlar alınamadı.'
        }
    }

    const fetchAll = async () => {
        pending.value = true
        error.value = null

        await Promise.all([
            fetchUser(),
            fetchFiles(),
            fetchFolders(),
            fetchNotes()
        ])

        pending.value = false
    }

    return {
        user,
        files,
        folders,
        notes,
        pending,
        error,
        fetchUser,
        fetchFiles,
        fetchFolders,
        fetchNotes,
        fetchAll
    }
}