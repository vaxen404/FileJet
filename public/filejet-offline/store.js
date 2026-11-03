const DB = 'filejet-offline-notes-v1'
let database, syncing
const key = (owner, id) => `${owner}:${id}`
const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
function open() {
    return database ||= new Promise((resolve, reject) => {
        const request = indexedDB.open(DB, 1)
        request.onupgradeneeded = () => {
            request.result.createObjectStore('notes', { keyPath: 'key' }).createIndex('owner', 'owner')
            request.result.createObjectStore('settings')
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}
async function run(name, mode, work) {
    const db = await open()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(name, mode), store = tx.objectStore(name)
        let result
        const set = value => { result = value }
        tx.oncomplete = () => resolve(result)
        tx.onerror = tx.onabort = () => reject(tx.error || Error('Could not store your note on this device.'))
        try { work(store, set) } catch (error) { tx.abort(); reject(error) }
    })
}
export const getOwner = () => run('settings', 'readonly', (store, set) => { store.get('owner').onsuccess = event => set(event.target.result || null) })
export const setOwner = owner => { if (!uuid(owner)) throw Error('Invalid account.'); return run('settings', 'readwrite', store => store.put(owner, 'owner')) }
export const getNote = (owner, id) => run('notes', 'readonly', (store, set) => { store.get(key(owner, id)).onsuccess = event => set(event.target.result || null) })
export const listNotes = owner => run('notes', 'readonly', (store, set) => { store.index('owner').getAll(owner).onsuccess = event => set(event.target.result.sort((a,b) => b.localUpdatedAt - a.localUpdatedAt)) })
function change(owner, id, update) {
    if (!uuid(owner) || !uuid(id)) throw Error('Invalid note owner or ID.')
    return run('notes', 'readwrite', (store, set) => {
        store.get(key(owner,id)).onsuccess = event => {
            const next = update(event.target.result)
            if (next) { store.put({ ...next, key: key(owner,id), owner, id }); set({ ...next, owner, id }) }
        }
    })
}
export const cacheNote = (owner, note) => change(owner, note.id, old => old?.pending ? old : { title: note.title, content: note.content, baseUpdatedAt: note.updated_at, pending: false, isNew: false, revision: (old?.revision || 0) + 1, localUpdatedAt: Date.now(), error: '', conflict: false })
export const saveDraft = (owner, id, title, content) => change(owner,id, old => ({ ...(old || { baseUpdatedAt: null, isNew: true }), title, content, pending: true, revision: (old?.revision || 0) + 1, localUpdatedAt: Date.now(), error: '', conflict: false }))
export const removeNote = (owner,id) => run('notes', 'readwrite', store => store.delete(key(owner,id)))
export async function clearOwner(owner) {
    await run('notes', 'readwrite', store => { store.index('owner').openCursor(owner).onsuccess = event => { const cursor = event.target.result; if (cursor) { cursor.delete(); cursor.continue() } } })
    if (await getOwner() === owner) await run('settings', 'readwrite', store => store.delete('owner'))
}
async function authenticated(owner) {
    const response = await fetch('/api/users/@me', { cache: 'no-store' })
    if (!response.ok) throw Error('Sign in to the same account to sync. Your drafts remain on this device.')
    const user = await response.json()
    if (user.id !== owner) throw Error('Sign in to the original account to sync these notes.')
}
async function syncOwned(owner) {
    await authenticated(owner)
    for (const record of await listNotes(owner)) {
        if (!record.pending || record.conflict) continue
        let response
        try { response = await fetch('/api/notes/offline-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id, title: record.title, content: record.content, baseUpdatedAt: record.baseUpdatedAt, isNew: record.isNew }), signal: AbortSignal.timeout(30000) }) }
        catch { throw Error('Offline. Changes are saved on this device; sync will resume when connected.') }
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
            await change(owner, record.id, current => current && current.revision === record.revision ? { ...current, error: data.message || 'Could not sync this note.', conflict: response.status === 409 || response.status === 404 } : null)
            if (response.status === 401 || response.status === 403) throw Error('Sign in again to sync your drafts.')
            continue
        }
        await change(owner, record.id, current => !current ? null : current.revision === record.revision ? { ...current, title: data.title, content: data.content, pending: false, isNew: false, baseUpdatedAt: data.updated_at, error: '', conflict: false } : { ...current, baseUpdatedAt: data.updated_at, isNew: false })
    }
}
export function syncNotes(owner) {
    if (syncing) return syncing
    const execute = () => syncOwned(owner)
    syncing = (navigator.locks ? navigator.locks.request(`filejet-note-sync:${owner}`, execute) : execute()).finally(() => { syncing = null })
    return syncing
}
export async function registerOffline() {
    if (!('serviceWorker' in navigator)) throw Error('Offline access requires a browser with service worker support and HTTPS (or localhost).')
    const registration = await navigator.serviceWorker.register('/filejet-notes-sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    // Installation must complete before navigation or disconnection.
    return registration
}
