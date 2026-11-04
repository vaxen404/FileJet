import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/admin'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { throwError } from '../../../utils/error'
import { assertShareOrigin } from '../../../utils/shares'
import { readShareBody } from '../../../utils/shareBody'
import { isUuid } from '../../../utils/validation'
import { cleanupDeletedUser } from '../../../utils/userDeletion'
import { adminUserDeleteSchema } from '../../../../shared/schemas/admin'
import { writeAdminEvent } from '../../../utils/adminEvents'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const actor = await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    enforceRateLimit(event, `admin-delete-user:${actor.id}`, 10, 60000)
    const id = getRouterParam(event, 'id')
    if (!id || !isUuid(id)) throwError(400, 'Invalid user ID.')
    const parsed = adminUserDeleteSchema.safeParse(await readShareBody(event))
    if (!parsed.success) throwError(400, 'Type the username to confirm deletion.')
    await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('filejet-admin-users'))::text`
        const currentActor = await requireAdmin(event, tx)
        if (id === actor.id) throwError(400, 'You cannot delete your own account from administration.')
        // Serialize with storage writes and new upload sessions before removing them.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`
        const user = await tx.users.findUnique({ where: { id }, select: { id: true, username: true, role: true, storage_limit: true } })
        if (!user) throwError(404, 'User not found.')
        if (user.username !== parsed.data.confirmUsername) throwError(409, 'Username does not match. Refresh the account details and try again.')
        if (user.role === 'ADMIN' && await tx.users.count({ where: { role: 'ADMIN' } }) <= 1) throwError(409, 'At least one administrator must remain.')
        const sessions = await tx.upload_sessions.findMany({ where: { user_id: id }, select: { id: true } })
        await tx.upload_sessions.deleteMany({ where: { user_id: id } })
        await tx.user_deletion_jobs.create({ data: { user_id: id, upload_ids: sessions.map(session => session.id) } })
        await writeAdminEvent(tx, currentActor, 'account_deleted', user)
        // All owned library, share, Inbox, version, favorite and Trash rows cascade.
        await tx.users.delete({ where: { id } })
    }, { maxWait: 10000, timeout: 60000 })
    const cleaned = await cleanupDeletedUser(id)
    return { success: true, cleanupPending: !cleaned }
})
