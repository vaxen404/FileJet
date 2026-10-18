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

        const notes = await prisma.notes.findMany({
            where: {
                user_id: session.userId
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        return {
            notes: notes.map(note => ({ ...note, size: note.size.toString() }))
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throw createError({
            statusCode: 500,
            message: 'Notlar çekilirken bir hata oluştu!'
        })
    }
})
