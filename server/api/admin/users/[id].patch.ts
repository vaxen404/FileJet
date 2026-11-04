import argon2 from 'argon2'
import { prisma } from '../../../utils/prisma'
import { requireAdmin, adminUserSelect, adminUserView } from '../../../utils/admin'
import { throwError } from '../../../utils/error'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { assertShareOrigin } from '../../../utils/shares'
import { readShareBody } from '../../../utils/shareBody'
import { isUuid } from '../../../utils/validation'
import { adminUserUpdateSchema } from '../../../../shared/schemas/admin'
import { writeAdminEvent } from '../../../utils/adminEvents'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const actor = await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    enforceRateLimit(event, `admin-users:${actor.id}`, 30, 60000)
    const id = getRouterParam(event, 'id')
    if (!id || !isUuid(id)) throwError(400, 'Invalid user ID.')
    const parsed = adminUserUpdateSchema.safeParse(await readShareBody(event))
    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid user settings.')
    const { username, email, newPassword } = parsed.data
    const passwordHash = newPassword === undefined ? undefined : await argon2.hash(newPassword, { type: argon2.argon2id })
    try {
        return await prisma.$transaction(async tx => {
            // Serialize role changes and re-check the actor after acquiring the lock.
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('filejet-admin-users'))::text`
            const currentActor = await requireAdmin(event, tx)
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`
            const user = await tx.users.findUnique({ where: { id }, select: adminUserSelect })
            if (!user) throwError(404, 'User not found.')
            if (id === actor.id && parsed.data.role !== 'ADMIN') throwError(400, 'You cannot remove your own administrator role.')
            if (user.role === 'ADMIN' && parsed.data.role === 'USER' && await tx.users.count({ where: { role: 'ADMIN' } }) <= 1) {
                throwError(409, 'At least one administrator must remain.')
            }
            const limit = BigInt(parsed.data.storageLimit)
            if (limit < (user.storage_used ?? 0n)) throwError(400, 'Storage limit cannot be lower than current usage.')
            const identityChecks = [
                ...(username !== undefined ? [{ username: { equals: username, mode: 'insensitive' as const } }] : []),
                ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : [])
            ]
            if (identityChecks.length && await tx.users.findFirst({ where: { id: { not: id }, OR: identityChecks }, select: { id: true } })) {
                throwError(409, 'This username or email address is already in use.')
            }
            const updated = await tx.users.update({ where: { id }, data: {
                role: parsed.data.role, storage_limit: limit,
                ...(username !== undefined ? { username } : {}),
                ...(email !== undefined ? { email } : {}),
                ...(passwordHash !== undefined ? { password_hash: passwordHash } : {})
            }, select: adminUserSelect })
            if (user.role !== updated.role || user.storage_limit !== updated.storage_limit || user.username !== updated.username || user.email !== updated.email || passwordHash !== undefined) {
                await writeAdminEvent(tx, currentActor, 'account_updated', updated, user)
            }
            return { user: adminUserView(updated) }
        })
    } catch (error: any) {
        if (error.code === 'P2002') throwError(409, 'This username or email address is already in use.')
        throw error
    }
})
