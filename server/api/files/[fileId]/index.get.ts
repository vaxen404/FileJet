import { getFileMetadata } from '../../../utils/fileMetadata'
import { shareState } from '../../../utils/shares'
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const fileId = getRouterParam(event, 'fileId')

        if (!fileId || !isUuid(fileId)) {
            throwError(400, 'Invalid file ID.')
        }

        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                user_id: session.userId
            },
            include: { folders: { select: { id: true, name: true, user_id: true } } }
        })

        if (!file) {
            throwError(404, 'File not found.')
        }

        setHeader(event, 'Cache-Control', 'no-store')
        const [technicalMetadata, sharedItem] = await Promise.all([
            getFileMetadata(file),
            prisma.shared_items.findFirst({ where: { user_id: session.userId, item_id: file.id, item_type: 'file' } })
        ])

        return {
            ...file,
            folders: file.folders?.user_id === session.userId ? { id: file.folders.id, name: file.folders.name } : null,
            technical_metadata: technicalMetadata,
            share: shareState(event, sharedItem),
            size: file.size.toString()
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the file.')
    }
})
