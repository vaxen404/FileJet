export type StorageCategory = 'images' | 'documents' | 'videos' | 'others'

export interface StorageUsage {
    storageUsed: string
    storageLimit: string
    categories: Record<StorageCategory, string>
}
