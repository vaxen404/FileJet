export interface QuickPreviewItem {
    id: string
    resourceId?: string
    type: 'file' | 'note' | 'folder'
    name: string
    size?: string
    mime_type?: string | null
}
