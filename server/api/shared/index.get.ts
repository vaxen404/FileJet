import { requireOwnedShareItem, shareState } from '../../utils/shares'
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

        const { itemId, itemType } = getQuery(event)

        if (!itemId || typeof itemId !== 'string' || !itemType || typeof itemType !== 'string') {
            throwError(400, 'Missing data.')
        }

        if (!isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }

        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid item type.')
        }

        setHeader(event, 'Cache-Control', 'no-store')
        await requireOwnedShareItem(session.userId, itemId, itemType)
        const sharedItem = await prisma.shared_items.findFirst({
            where: {
                user_id: session.userId,
                item_id: itemId,
                item_type: itemType
            }
        })

        return shareState(event, sharedItem)
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the share link.')
    }
})