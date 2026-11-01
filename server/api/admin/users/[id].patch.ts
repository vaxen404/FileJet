import { prisma } from '../../../utils/prisma'
import { requireAdmin, adminUserSelect, adminUserView } from '../../../utils/admin'
import { throwError } from '../../../utils/error'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { assertShareOrigin } from '../../../utils/shares'
import { readShareBody } from '../../../utils/shareBody'
import { isUuid } from '../../../utils/validation'
import { adminUserUpdateSchema } from '../../../../shared/schemas/admin'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const actor = await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    enforceRateLimit(event, `admin-users:${actor.id}`, 30, 60000)
    const id = getRouterParam(event, 'id')
    if (!id || !isUuid(id)) throwError(400, 'Invalid user ID.')
    const parsed = adminUserUpdateSchema.safeParse(await readShareBody(event))
    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid user settings.')
    return prisma.$transaction(async tx => {
        // Serialize role changes and re-check the actor after acquiring the lock.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('filejet-admin-users'))::text`
        await requireAdmin(event, tx)
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`
        const user = await tx.users.findUnique({ where: { id }, select: adminUserSelect })
        if (!user) throwError(404, 'User not found.')
        if (id === actor.id && parsed.data.role !== 'ADMIN') throwError(400, 'You cannot remove your own administrator role.')
        if (user.role === 'ADMIN' && parsed.data.role === 'USER' && await tx.users.count({ where: { role: 'ADMIN' } }) <= 1) {
            throwError(409, 'At least one administrator must remain.')
        }
        const limit = BigInt(parsed.data.storageLimit)
        if (limit < (user.storage_used ?? 0n)) throwError(400, 'Storage limit cannot be lower than current usage.')
        const updated = await tx.users.update({ where: { id }, data: { role: parsed.data.role, storage_limit: limit }, select: adminUserSelect })
        return { user: adminUserView(updated) }
    })
})
