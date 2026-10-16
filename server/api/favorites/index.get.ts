import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const favorites = await prisma.favorites.findMany({
            where: {
                user_id: session.userId,
                OR: [
                    { files: { is: { user_id: session.userId } }, folder_id: null, note_id: null },
                    { folders: { is: { user_id: session.userId } }, file_id: null, note_id: null },
                    { notes: { is: { user_id: session.userId } }, file_id: null, folder_id: null }
                ]
            },
            include: {
                files: { select: {
                    id: true, user_id: true, folder_id: true, name: true, original_name: true,
                    mime_type: true, size: true, created_at: true, updated_at: true
                } },
                folders: true,
                notes: true
            },
            orderBy: {
                created_at: 'desc'
            }
        })


        return {
            favorites: favorites.map((item) => ({
                ...item,
                files: item.files
                    ? {
                        ...item.files,
                        size: item.files.size.toString()
                    }
                    : null,
                notes: item.notes
                    ? {
                        ...item.notes,
                        size: item.notes.size.toString()
                    }
                    : null
            }))
        }
    } catch (err: any) {
        console.log(err.message);
        if (err.statusCode) throw err

        throwError(
            500,
            'An unknown error occurred while fetching favorites.'
        )
    }
})
