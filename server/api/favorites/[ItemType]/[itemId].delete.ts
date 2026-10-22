import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `remove-favorite:${session.userId}`, 10, 60 * 1000)

        const itemId = getRouterParam(event, 'itemId')
        const itemType = getRouterParam(event, 'itemType')

        if (!itemId || !itemType) {
            throwError(400, 'Missing data.')
        }

        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid favorite type.')
        }

        const item = await prisma.favorites.findFirst({
            where: {
                user_id: session.userId,
                ...(itemType === 'file' && {
                    file_id: itemId
                }),
                ...(itemType === 'folder' && {
                    folder_id: itemId
                }),
                ...(itemType === 'note' && {
                    note_id: itemId
                })
            }
        })

        if (!item) {
            throwError(404, 'Item not found.')
        }

        await prisma.favorites.delete({
            where: {
                id: item.id
            }
        })

        return {
            success: true
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while removing from favorites.')
    }
})
