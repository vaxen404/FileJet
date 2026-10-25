import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { enforceRateLimit } from '~~/server/utils/rateLimit'
import { accountProfileSchema } from '~~/shared/schemas/account'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) throwError(401, 'You need to be logged in.')

        enforceRateLimit(event, `account-profile:${session.userId}`, 10, 10 * 60 * 1000)

        const parsed = accountProfileSchema.safeParse(await readBody(event))

        if (!parsed.success) throwError(400, parsed.error.issues[0]?.message || 'Invalid account details.')

        const { username, email } = parsed.data
        const account = await prisma.users.findUnique({
            where: { id: session.userId },
            select: { id: true }
        })

        if (!account) throwError(401, 'Invalid session.')

        const duplicate = await prisma.users.findFirst({
            where: {
                id: { not: session.userId },
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : [])
                ]
            },
            select: { username: true }
        })

        if (duplicate) {
            throwError(409, duplicate.username.toLowerCase() === username.toLowerCase()
                ? 'This username is already in use.'
                : 'This email address is already in use.')
        }

        const user = await prisma.users.update({
            where: { id: session.userId },
            data: { username, email },
            select: {
                id: true, username: true, email: true,
                storage_limit: true, storage_used: true, created_at: true
            }
        })

        return {
            success: true,
            user: {
                id: user.id, username: user.username, email: user.email,
                storageLimit: user.storage_limit?.toString() ?? '0',
                storageUsed: user.storage_used?.toString() ?? '0',
                createdAt: user.created_at
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'P2002') throwError(409, 'This username or email address is already in use.')
        if (error.code === 'P2025') throwError(409, 'Your account changed. Reload the page and try again.')

        throwError(500, 'Your account details could not be updated.')
    }
})
