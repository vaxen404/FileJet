export const useFileHeader = () => useState<{
    fileId: string
    fileName: string
    returnPath: string
    returnName: string
} | null>('file-detail-header', () => null)
