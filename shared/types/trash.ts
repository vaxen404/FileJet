export type TrashItemType = 'file' | 'folder' | 'note'

export interface TrashMoveResult {
    success: boolean
    deletedIds: string[]
    failedIds: string[]
    trashIds: string[]
}

export interface TrashMoveOptions {
    notify?: boolean
}
