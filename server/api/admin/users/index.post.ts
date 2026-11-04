import argon2 from 'argon2'
import { prisma } from '../../../utils/prisma'
import { requireAdmin, adminUserSelect, adminUserView } from '../../../utils/admin'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { throwError } from '../../../utils/error'
import { assertShareOrigin } from '../../../utils/shares'
import { readShareBody } from '../../../utils/shareBody'
import { adminUserCreateSchema } from '../../../../shared/schemas/admin'
import { writeAdminEvent } from '../../../utils/adminEvents'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const actor = await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    enforceRateLimit(event, `admin-create-user:${actor.id}`, 10, 60000)
    const parsed = adminUserCreateSchema.safeParse(await readShareBody(event))
    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid account details.')
    const { username, email, password, role, storageLimit } = parsed.data
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
    try {
        const user = await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('filejet-admin-users'))::text`
            const currentActor = await requireAdmin(event, tx)
            const duplicate = await tx.users.findFirst({ where: { OR: [
                { username: { equals: username, mode: 'insensitive' } },
                ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : [])
            ] }, select: { id: true } })
            if (duplicate) throwError(409, 'This username or email address is already in use.')
            const created = await tx.users.create({ data: { username, email, password_hash: passwordHash, role, storage_limit: BigInt(storageLimit) }, select: adminUserSelect })
            await writeAdminEvent(tx, currentActor, 'account_created', created)
            return created
        })
        setResponseStatus(event, 201)
        return { user: adminUserView(user) }
    } catch (error: any) {
        if (error.code === 'P2002') throwError(409, 'This username or email address is already in use.')
        throw error
    }
})
