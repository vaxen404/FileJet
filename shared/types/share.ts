export interface ShareState {
    url: string | null
    hasPassword: boolean
    expiresAt: string | null
    isExpired: boolean
}

export type SharedItemType = 'file' | 'folder' | 'note'

export interface SharedListItem extends ShareState {
    id: string
    itemId: string
    itemType: SharedItemType
    name: string
    mimeType: string | null
    size: string | null
    token: string
    url: string
    createdAt: string
    isAvailable: boolean
}

export const emptyShareState = (): ShareState => ({
    url: null,
    hasPassword: false,
    expiresAt: null,
    isExpired: false
})
