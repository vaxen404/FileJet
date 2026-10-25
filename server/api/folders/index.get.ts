import { throwError } from '~~/server/utils/error'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
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

        throwError(500, 'Failed to fetch folders.')
    }
})
