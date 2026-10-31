export interface FileRequestItem {
    id: string
    title: string
    description: string
    folderId: string | null
    folderName: string
    url: string
    isOpen: boolean
    isAvailable: boolean
    expiresAt: string | null
    maxFileSize: number
    maxFiles: number
    receivedCount: number
    pendingCount: number
    createdAt: string
}

export interface ReceivedFile {
    id: string
    requestId: string
    requestTitle: string
    fileId: string | null
    name: string
    senderName: string
    size: string
    mimeType: string | null
    status: 'pending' | 'approved' | 'rejected'
    reviewedAt: string | null
    createdAt: string
}

export interface InboxFolder {
    id: string
    name: string
    parent_folder_id: string | null
}

export interface PublicFileRequest {
    title: string
    description: string
    maxFileSize: number
    maxFilesPerUpload: number
}
