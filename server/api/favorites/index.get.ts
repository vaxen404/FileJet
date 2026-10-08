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
                user_id: session.userId
            },
            include: {
                files: true,
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
                        size: Number(item.files.size)
                    }
                    : null,
                notes: item.notes
                    ? {
                        ...item.notes,
                        size: Number(item.notes.size)
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