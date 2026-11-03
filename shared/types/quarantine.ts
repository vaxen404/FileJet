import type { FileScanState } from './fileScan'
export interface QuarantineEntry extends FileScanState {
    id: string
    name: string
    kind: 'file' | 'version' | 'inbox' | 'trash' | 'upload'
    location: string
    size: string
    href: string | null
    deleteUrl: string
    deleteLabel: string
}
export interface QuarantinePage { items: QuarantineEntry[]; nextCursor: string | null }
