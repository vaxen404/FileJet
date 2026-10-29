import type { ActivityNotification, NotificationHistory } from '~~/shared/types/notification'

export const NOTIFICATION_LIMIT = 50
export const NOTIFICATION_RETENTION = 30 * 86400000

export const safeNotificationHref = (href: unknown): string | null => {
    if (typeof href !== 'string' || href.length > 500 || !href.startsWith('/') || href.startsWith('//') || /[\\\u0000-\u0020]/.test(href)) return null
    return href
}

export const normalizeNotificationHistory = (value: unknown, now = Date.now()): NotificationHistory => {
    const result: NotificationHistory = { version: 1, entries: [], seen: [] }
    if (!value || typeof value !== 'object') return result
    const source = value as Record<string, unknown>
    if (source.version !== 1 || !Array.isArray(source.entries)) return result
    const ids = new Set<string>()

    for (const item of source.entries) {
        if (!item || typeof item !== 'object') continue
        const entry = item as Record<string, unknown>
        if (typeof entry.id !== 'string' || !entry.id || entry.id.length > 100 || ids.has(entry.id)
            || typeof entry.title !== 'string' || !entry.title.trim() || typeof entry.message !== 'string'
            || typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt)
            || entry.createdAt < now - NOTIFICATION_RETENTION || entry.createdAt > now + 86400000
            || !['success', 'error', 'warning'].includes(String(entry.kind))
            || !['activity', 'upload', 'library', 'sharing', 'account', 'storage'].includes(String(entry.category))) continue
        ids.add(entry.id)
        result.entries.push({
            id: entry.id, title: entry.title.trim().slice(0, 80), message: entry.message.slice(0, 500),
            kind: entry.kind as ActivityNotification['kind'], category: entry.category as ActivityNotification['category'],
            href: safeNotificationHref(entry.href), createdAt: entry.createdAt, read: entry.read === true
        })
    }
    result.entries.sort((a, b) => b.createdAt - a.createdAt)
    result.entries = result.entries.slice(0, NOTIFICATION_LIMIT)

    if (Array.isArray(source.seen)) {
        const keys = new Set<string>()
        for (const item of source.seen) {
            if (!item || typeof item !== 'object' || typeof item.key !== 'string' || item.key.length > 150
                || keys.has(item.key) || typeof item.at !== 'number' || !Number.isFinite(item.at)
                || item.at < now - NOTIFICATION_RETENTION || item.at > now + 86400000) continue
            keys.add(item.key)
            result.seen.push({ key: item.key, at: item.at })
        }
        result.seen = result.seen.sort((a, b) => b.at - a.at).slice(0, 100)
    }
    return result
}

export const formatNotificationTime = (createdAt: number, now = Date.now()) => {
    const seconds = Math.max(0, Math.floor((now - createdAt) / 1000))
    if (seconds < 60) return 'Just now'
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
    if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
    if (seconds < 604800) return formatter.format(-Math.floor(seconds / 86400), 'day')
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(createdAt)
}

export const getStorageStatus = (usedValue: string | number, limitValue: string | number) => {
    const used = Math.max(0, Number(usedValue))
    const limit = Number(limitValue)
    const percent = Number.isFinite(used) && Number.isFinite(limit) && limit > 0 ? Math.min(100, used / limit * 100) : 0
    return { used, limit, percent, level: percent >= 100 ? 'full' : percent >= 85 ? 'high' : 'normal' } as const
}
