import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in')
        }

        const { itemType, itemId } = await readBody(event)

        if (!itemType || !itemId) {
            throwError(400, 'Missing data.')
        }

        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid favorite type.')
        }

        const existingFavorite = await prisma.favorites.findFirst({
            where: {
                user_id: session.userId,
                ...(itemType === 'file' && { file_id: itemId }),
                ...(itemType === 'folder' && { folder_id: itemId }),
                ...(itemType === 'note' && { note_id: itemId })
            }
        })

        if (existingFavorite) {
            throwError(409, 'Item is already in favorites.')
        }

        const favorite = await prisma.favorites.create({
            data: {
                user_id: session.userId,
                file_id: itemType === 'file' ? itemId : null,
                folder_id: itemType === 'folder' ? itemId : null,
                note_id: itemType === 'note' ? itemId : null
            }
        })

        return {
            success: true,
            favorite
        }

    } catch (err: any) {
        console.log(err.message);
        if (err.statusCode) throw err

        throwError(
            500, 
            'An unknown error occurred while adding to favorites.'
        )
    }
})