import { resolve, sep } from 'node:path'
import { throwError } from './error'
import { isUuid } from './validation'

export function resolveTrashStoragePath(userId: string, storageKey: string | null): string {
    if (!isUuid(userId) || !storageKey || storageKey.includes('\\') || storageKey.includes('\0')) {
        throwError(409, 'Invalid storage key.')
    }

    const parts = storageKey.split('/')

    if (parts.some(part => !part || part === '.' || part === '..' || part.includes(':'))) {
        throwError(409, 'Invalid storage key.')
    }

    // Current uploads include the owner prefix; legacy records store only a basename.
    if (parts.length > 1 && parts[0] !== userId) {
        throwError(409, 'Invalid storage key.')
    }

    const ownerRoot = resolve(process.cwd(), 'storage', userId)
    const filePath = parts.length === 1
        ? resolve(ownerRoot, storageKey)
        : resolve(process.cwd(), 'storage', storageKey)

    if (!filePath.startsWith(ownerRoot + sep)) {
        throwError(409, 'Invalid storage key.')
    }

    return filePath
}
