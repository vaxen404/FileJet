import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"

export default defineEventHandler(async ( event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throw createError({
                statusCode: 401,
                message: 'Oturum açmanız gerekiyor.'
            })
        }

        const folders = await prisma.folders.findMany({
            where: {
                user_id: session.userId,
                parent_folder_id: null
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        return {
            folders
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throw createError({
            statusCode: 500,
            message: 'Klasörler çekilirken bir hata oluştu!'
        })
    }
})
