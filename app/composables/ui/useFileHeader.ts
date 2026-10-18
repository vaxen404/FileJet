export const useFileHeader = () =>
    useState<{
        fileId: string
        fileName: string
        returnPath: string
        returnName: string
        itemType?: 'file' | 'note' | 'folder'
    } | null>('file-detail-header', () => null)
