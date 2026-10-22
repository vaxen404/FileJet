import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const sharedItems = await prisma.shared_items.findMany({
            where: {
                user_id: session.userId
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        const origin = getRequestURL(event).origin

        return sharedItems.map(item => ({
            id: item.id,
            itemId: item.item_id,
            itemType: item.item_type,
            token: item.token,
            url: `${origin}/shared/${item.token}`,
            createdAt: item.created_at
        }))
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting shared items.')
    }
})
