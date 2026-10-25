import { throwError } from '~~/server/utils/error'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const user = await prisma.users.findUnique({
            where: {
                id: session.userId
            },
            select: {
                id: true,
                username: true,
                email: true,
                storage_limit: true,
                storage_used: true,
                created_at: true
            }
        })

        if (!user) {
            throwError(401, 'Invalid session.')
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            storageLimit: user.storage_limit?.toString() ?? '0',
            storageUsed: user.storage_used?.toString() ?? '0',
            createdAt: user.created_at
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Failed to fetch user information.')
    }
})
