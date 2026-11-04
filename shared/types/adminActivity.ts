import type { ActivityEntry } from './activity'
export const adminActionLabels = { account_created: 'Account created', account_updated: 'Account updated', account_deleted: 'Account deleted' } as const
export type AdminAction = keyof typeof adminActionLabels
export interface AdminEvent {
    id: string; actorId: string | null; actorName: string; userId: string; username: string; action: AdminAction
    roleBefore: 'USER' | 'ADMIN' | null; roleAfter: 'USER' | 'ADMIN' | null
    quotaBefore: string | null; quotaAfter: string | null; createdAt: string
}
export interface AdminUserActivity extends ActivityEntry { userId: string; username: string }
export type AdminHistoryPage = { source: 'user'; items: AdminUserActivity[]; nextCursor: string | null } | { source: 'admin'; items: AdminEvent[]; nextCursor: string | null }
