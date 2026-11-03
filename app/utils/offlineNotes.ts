export interface OfflineNote { id: string; title: string; content: string; updated_at: string | null }
export interface DeviceNote { id: string; title: string; content: string; pending: boolean; conflict: boolean; error: string }
interface OfflineStore {
    setOwner: (owner: string) => Promise<void>
    cacheNote: (owner: string, note: OfflineNote) => Promise<DeviceNote>
    getNote: (owner: string, id: string) => Promise<DeviceNote | null>
    clearOwner: (owner: string) => Promise<void>
    registerOffline: () => Promise<ServiceWorkerRegistration>
}
export const loadOfflineStore = async (): Promise<OfflineStore> => {
    const path = '/filejet-offline/store.js'
    return import(/* @vite-ignore */ path)
}
