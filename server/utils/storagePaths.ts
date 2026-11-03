import { resolve, sep } from 'node:path'

export function resolveStoragePath(storageKey: string): string {
    const root = resolve(process.cwd(), 'storage')
    const path = resolve(root, storageKey)
    if (!path.startsWith(root + sep)) throw new Error('Invalid storage path.')
    return path
}
