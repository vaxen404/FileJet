import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const { itemId, itemType } = getQuery(event)

        if (!itemId || typeof itemId !== 'string' || !itemType || typeof itemType !== 'string') {
            throwError(400, 'Missing data.')
        }

        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid item type.')
        }

        const sharedItem = await prisma.shared_items.findFirst({
            where: {
                user_id: session.userId,
                item_id: itemId,
                item_type: itemType
            }
        })

        if (!sharedItem) {
            return {
                url: null
            }
        }

        const origin = getRequestURL(event).origin

        return {
            url: `${origin}/shared/${sharedItem.token}`
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the share link.')
    }
})