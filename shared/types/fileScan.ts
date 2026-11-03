export type FileScanStatus = 'unscanned' | 'scanning' | 'clean' | 'infected' | 'error'
export interface FileScanState {
    status: FileScanStatus
    threat: string | null
    message: string | null
    checkedAt: string | null
}
