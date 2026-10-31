import type { NotificationInput, NotificationHistory } from '~~/shared/types/notification'
import { normalizeNotificationHistory, NOTIFICATION_LIMIT, safeNotificationHref } from '~/utils/notifications'

export const useNotifications = () => {
    const currentUser = useAuthUser()
    const history = useState<NotificationHistory>('notification-history', () => ({ version: 1, entries: [], seen: [] }))
    const ownerId = useState<string | null>('notification-owner', () => null)
    const storageAvailable = useState<boolean>('notification-storage-available', () => true)
    const entries = computed(() => {
        if (!ownerId.value || ownerId.value !== currentUser.value?.id) return []

        return history.value.entries
    })
    const unreadCount = computed(() => entries.value.filter(entry => !entry.read).length)

    const loadNotifications = () => {
        const id = currentUser.value?.id ?? null
        ownerId.value = id
        history.value = { version: 1, entries: [], seen: [] }
        storageAvailable.value = true
        if (!import.meta.client || !id) return

        try {
            const stored = localStorage.getItem(`filejet:notifications:${id}`)
            if (stored) history.value = normalizeNotificationHistory(JSON.parse(stored))
        } catch {
            storageAvailable.value = false
        }
    }

    const ensureOwner = () => {
        if (!import.meta.client || !currentUser.value) return false
        if (ownerId.value !== currentUser.value.id) loadNotifications()
        return true
    }

    const persist = () => {
        if (!ensureOwner()) return

        try {
            localStorage.setItem(`filejet:notifications:${ownerId.value}`, JSON.stringify(history.value))
            storageAvailable.value = true
        } catch {
            storageAvailable.value = false
        }
    }

    const addNotification = (input: NotificationInput, expectedOwnerId?: string | null) => {
        if (expectedOwnerId !== undefined && expectedOwnerId !== currentUser.value?.id) return null
        if (!ensureOwner() || !input.title.trim()) return null

        const now = Date.now()
        history.value = normalizeNotificationHistory(history.value, now)
        if (input.dedupeKey && history.value.seen.some(entry => entry.key === input.dedupeKey)) return null

        const id = `${now}-${Math.random().toString(36).slice(2)}`
        history.value.entries.unshift({
            id,
            title: input.title.trim().slice(0, 80),
            message: input.message.slice(0, 500),
            kind: input.kind ?? 'success',
            category: input.category ?? 'activity',
            href: safeNotificationHref(input.href),
            createdAt: now,
            read: false
        })
        history.value.entries = history.value.entries.slice(0, NOTIFICATION_LIMIT)
        if (input.dedupeKey) history.value.seen.unshift({ key: input.dedupeKey.slice(0, 150), at: now })
        history.value.seen = history.value.seen.slice(0, 100)
        persist()
        return id
    }

    const markRead = (id: string) => {
        if (!ensureOwner()) return

        const entry = history.value.entries.find(entry => entry.id === id)
        if (!entry || entry.read) return

        entry.read = true
        persist()
    }

    const markAllRead = () => {
        if (!ensureOwner()) return
        history.value.entries.forEach(entry => { entry.read = true })
        persist()
    }

    const dismiss = (id: string) => {
        if (!ensureOwner()) return
        history.value.entries = history.value.entries.filter(entry => entry.id !== id)
        persist()
    }

    const clearRead = () => {
        if (!ensureOwner()) return
        history.value.entries = history.value.entries.filter(entry => !entry.read)
        persist()
    }

    return { entries, unreadCount, storageAvailable, loadNotifications, addNotification, markRead, markAllRead, dismiss, clearRead }
}
