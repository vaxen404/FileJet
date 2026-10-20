import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    const folders = await prisma.folders.findMany({
        where: { user_id: session.userId },
        select: { id: true, name: true, parent_folder_id: true },
        orderBy: { name: 'asc' }
    })
    return { folders }
})
