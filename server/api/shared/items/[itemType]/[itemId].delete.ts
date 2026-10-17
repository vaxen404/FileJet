import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from "~~/server/utils/validation"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `shared-remove:${session.userId}`, 10, 60 * 1000)

        const itemId = getRouterParam(event, 'itemId')
        const itemType = getRouterParam(event, 'itemType')

        if (typeof itemId !== 'string' || typeof itemType !== 'string') {
            throwError(400, 'Invalid data.')
        }

        if (!isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }
        
        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid item type.')
        }

        const result = await prisma.shared_items.deleteMany({
            where: {
                item_id: itemId,
                user_id: session.userId,
                item_type: itemType
            }
        })

        if (result.count === 0) {
            throwError(404, 'Share link not found.')
        }

        return {
            success: true
        }
    } catch (err: any) {
        if (err.statusCode) throw err
        
        throwError(500, 'An error while removing the share link.')
    }
})
