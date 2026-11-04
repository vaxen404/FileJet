import type { Prisma } from '~~/src/generated/prisma/client'
import type { AdminAction, AdminEvent } from '../../shared/types/adminActivity'
interface AccountSnapshot { id: string; username: string; role: 'USER' | 'ADMIN'; storage_limit: bigint | null }
export async function writeAdminEvent(tx: Prisma.TransactionClient, actor: { id: string; username: string }, action: AdminAction, target: AccountSnapshot, before?: AccountSnapshot) {
    return tx.admin_events.create({ data: {
        actor_id: actor.id, actor_username: actor.username, target_user_id: target.id, target_username: target.username, action,
        role_before: before?.role ?? (action === 'account_deleted' ? target.role : null),
        role_after: action === 'account_deleted' ? null : target.role,
        quota_before: before?.storage_limit ?? (action === 'account_deleted' ? target.storage_limit : null),
        quota_after: action === 'account_deleted' ? null : target.storage_limit
    } })
}
export const adminEventView = (row: Prisma.admin_eventsGetPayload<object>): AdminEvent => ({
    id: row.id, actorId: row.actor_id, actorName: row.actor_username, userId: row.target_user_id, username: row.target_username,
    action: row.action as AdminAction, roleBefore: row.role_before, roleAfter: row.role_after,
    quotaBefore: row.quota_before?.toString() ?? null, quotaAfter: row.quota_after?.toString() ?? null, createdAt: row.created_at.toISOString()
})
