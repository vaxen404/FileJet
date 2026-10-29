export type NotificationKind = 'success' | 'error' | 'warning'
export type NotificationCategory = 'activity' | 'upload' | 'library' | 'sharing' | 'account' | 'storage'

export interface NotificationInput {
    title: string
    message: string
    kind?: NotificationKind
    category?: NotificationCategory
    href?: string
    dedupeKey?: string
}

export interface ActivityNotification {
    id: string
    title: string
    message: string
    kind: NotificationKind
    category: NotificationCategory
    href: string | null
    createdAt: number
    read: boolean
}

export interface NotificationHistory {
    version: 1
    entries: ActivityNotification[]
    seen: { key: string; at: number }[]
}
