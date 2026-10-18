import type { ShareState } from './share'

export interface LibraryItem {
    id: string
    type: 'file' | 'folder' | 'note'
    name: string
    original_name?: string
    mime_type?: string | null
    size: string
    created_at: string | null
    updated_at: string | null
}

export interface NoteDetails {
    id: string
    user_id: string
    folder_id: string | null
    title: string
    content: string
    size: string
    created_at: string | null
    updated_at: string | null
    folder: { id: string; name: string } | null
    share: ShareState
}

export interface FolderDetails {
    id: string
    name: string
    parent_folder_id: string | null
    created_at: string | null
    updated_at: string | null
    parent: { id: string; name: string } | null
    items: LibraryItem[]
    counts: { files: number; folders: number; notes: number }
    totalSize: string
    share: ShareState
}
