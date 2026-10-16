import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { lockStorageUser } from '~~/server/utils/storage'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)
        if (!session) throwError(401, 'You need to be logged in.')
        enforceRateLimit(event, `favorites-add:${session.userId}`, 10, 60000)
        const body = await readBody(event)
        if (!body || typeof body !== 'object' || Array.isArray(body)) throwError(400, 'Invalid request body.')
        const { itemType, itemId } = body
        if (typeof itemId !== 'string' || !isUuid(itemId) || !['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid favorite data.')
        }
        return await prisma.$transaction(async tx => {
            await lockStorageUser(tx, session.userId)
            const query = { where: { id: itemId, user_id: session.userId }, select: { id: true } }
            const item = itemType === 'file' ? await tx.files.findFirst(query)
                : itemType === 'folder' ? await tx.folders.findFirst(query)
                : await tx.notes.findFirst(query)
            if (!item) throwError(404, 'Item not found.')
            const target = {
                file_id: itemType === 'file' ? itemId : null,
                folder_id: itemType === 'folder' ? itemId : null,
                note_id: itemType === 'note' ? itemId : null
            }
            const existing = await tx.favorites.findFirst({ where: { user_id: session.userId, ...target } })
            if (existing) throwError(409, 'Item is already in favorites.')
            const favorite = await tx.favorites.create({ data: { user_id: session.userId, ...target } })
            return { success: true, favorite }
        })
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'P2002') throwError(409, 'Item is already in favorites.')
        if (error.code === 'P2003') throwError(404, 'Item not found.')
        console.error('Favorite creation failed:', error)
        throwError(500, 'An unknown error occurred while adding to favorites.')
    }
})
