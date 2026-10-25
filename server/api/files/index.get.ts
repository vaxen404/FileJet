import { throwError } from '~~/server/utils/error'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
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

        throwError(500, 'Failed to fetch files.')
    }
})
