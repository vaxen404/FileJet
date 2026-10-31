import type { FileRequestItem } from '~~/shared/types/inbox'

export const isInboxExpired = (item: FileRequestItem, now: number) =>
    !!item.expiresAt && new Date(item.expiresAt).getTime() <= now

export const getInboxStatus = (item: FileRequestItem, now: number) => {
    if (!item.isAvailable) return 'Unavailable'
    if (isInboxExpired(item, now)) return 'Expired'
    if (item.receivedCount >= item.maxFiles) return 'Full'
    return item.isOpen ? 'Open' : 'Closed'
}
