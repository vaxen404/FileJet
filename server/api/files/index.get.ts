import { prisma } from "~~/server/utils/prisma";
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

        const files = await prisma.files.findMany({
            where: {
                user_id: session.userId,
                folder_id: null
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        return {
            files: files.map(file => ({
                ...file,
                size: file.size.toString()
            }))
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throw createError({
            statusCode: 500,
            message: 'Dosyalar çekilirken bir hata oluştu!'
        })
    }
})
