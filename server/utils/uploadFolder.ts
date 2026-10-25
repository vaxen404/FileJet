import { throwError } from './error'
import { getQuery, type H3Event } from 'h3'
import { prisma } from './prisma'
import { isUuid } from './validation'

export async function getUploadFolder(event: H3Event, userId: string) {
    const id = getQuery(event).folderId

    if (id === undefined) return null

    if (typeof id !== 'string' || !isUuid(id)) {
        throwError(400, 'Invalid destination folder.')
    }

    const folder = await prisma.folders.findFirst({
        where: { id, user_id: userId },
        select: { id: true }
    })

    if (!folder) throwError(404, 'Destination folder not found.')

    return folder.id
}
