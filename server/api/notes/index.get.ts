import { throwError } from '~~/server/utils/error'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
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

        throwError(500, 'Failed to fetch notes.')
    }
})
