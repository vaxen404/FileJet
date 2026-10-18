import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `files-delete:${session.userId}`, 10, 60 * 1000)

        const fileId = getRouterParam(event, 'fileId')

        if (typeof fileId !== 'string' || !isUuid(fileId)) {
            throwError(400, 'Invalid file ID.')
        }

        const trashId = await prisma.$transaction(async tx => {
            const file = await tx.files.findFirst({
                where: {
                    id: fileId,
                    user_id: session.userId
                }
            })

            if (!file) {
                throwError(404, 'File not found.')
            }

            const trashed = await tx.trash.create({
                data: {
                    user_id: session.userId,
                    item_id: file.id,
                    item_type: 'file',
                    name: file.name,
                    original_name: file.original_name,
                    mime_type: file.mime_type,
                    size: file.size,
                    storage_key: file.storage_key,
                    folder_id: file.folder_id
                }
            })

            await tx.favorites.deleteMany({
                where: {
                    user_id: session.userId,
                    file_id: file.id
                }
            })

            await tx.shared_items.deleteMany({
                where: {
                    user_id: session.userId,
                    item_id: file.id,
                    item_type: 'file'
                }
            })

            await tx.files.delete({
                where: {
                    id: file.id,
                    user_id: session.userId
                }
            })
            return trashed.id
        })

        return {
            success: true,
            deletedIds: [fileId],
            failedIds: [],
            trashIds: [trashId]
        }
    } catch (err: unknown) {
        console.error('[FILE DELETE ERROR]', err)

        if (
            err &&
            typeof err === 'object' &&
            'statusCode' in err
        ) {
            throw err
        }

        throwError(500, 'An error occurred while deleting the file.')
    }
})
