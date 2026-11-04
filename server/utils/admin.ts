import type { H3Event } from 'h3'
import type { Prisma } from '~~/src/generated/prisma/client'
import { prisma } from './prisma'
import { getAuthSession } from './auth'
import { throwError } from './error'

export async function requireAdmin(event: H3Event, db: Pick<Prisma.TransactionClient, 'users'> = prisma) {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    const user = await db.users.findUnique({ where: { id: session.userId }, select: { id: true, role: true, username: true } })
    if (!user) throwError(401, 'Invalid session.')
    if (user.role !== 'ADMIN') throwError(403, 'Administrator access required.')
    return user
}

export const adminUserSelect = {
    id: true, username: true, email: true, role: true,
    storage_limit: true, storage_used: true, created_at: true
} as const

export function adminUserView(user: Prisma.usersGetPayload<{ select: typeof adminUserSelect }>) {
    return {
        id: user.id, username: user.username, email: user.email, role: user.role,
        storageLimit: (user.storage_limit ?? 0n).toString(),
        storageUsed: (user.storage_used ?? 0n).toString(), createdAt: user.created_at?.toISOString() ?? null
    }
}
