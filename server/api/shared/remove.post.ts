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

        const body = await readBody(event)

        if (!body || typeof body !== 'object') {
            throwError(400, 'Invalid request body.')
        }

        const { itemId, itemType } = body

        if (typeof itemId !== 'string' || typeof itemType !== 'string') {
            throwError(400, 'Invalid data.')
        }

        if (!isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }
        
        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid item type.')
        }

        const sharedItem = await prisma.shared_items.findFirst({
            where: {
                item_id: itemId,
                user_id: session.userId,
                item_type: itemType
            }
        })

        if (!sharedItem) {
            throwError(404, 'Share link not found.')
        }

        await prisma.shared_items.delete({
            where: {
                id: sharedItem.id
            }
        })

        return {
            success: true
        }
    } catch (err: any) {
        if (err.statusCode) throw err
        
        throwError(500, 'An error while removing the share link.')
    }
})