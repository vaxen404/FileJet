export interface DraftEnvelope<T> { version: 1; savedAt: number; value: T }
const lifetime = 7 * 24 * 60 * 60 * 1000
export function browserDraftStorage(): Storage | null { try { return localStorage } catch { return null } }
export function readFormDraft<T>(storage: Storage | null, key: string, valid: (value: unknown) => value is T): T | null {
    if (!storage) return null
    try {
        const item = JSON.parse(storage.getItem(key) || 'null') as DraftEnvelope<unknown> | null
        if (item?.version === 1 && Number.isFinite(item.savedAt) && item.savedAt <= Date.now() && Date.now() - item.savedAt < lifetime && valid(item.value)) return item.value
        storage.removeItem(key)
    } catch { /* Storage can be unavailable in private browsing. */ }
    return null
}
export function writeFormDraft<T>(storage: Storage | null, key: string, value: T | null): boolean {
    if (!storage) return false
    try {
        if (value === null) storage.removeItem(key)
        else storage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), value }))
        return value !== null
    } catch { return false }
}
