import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) throwError(401, 'You need to be logged in.')

        enforceRateLimit(event, `files-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (
            !body ||
            !Array.isArray(body.fileIds) ||
            !body.fileIds.length ||
            body.fileIds.length > 200
        ) {
            throwError(400, 'Select between 1 and 200 files.')
        }

        if (body.fileIds.some((id: unknown) => typeof id !== 'string' || !isUuid(id))) {
            throwError(400, 'Invalid file ID.')
        }

        const fileIds = [...new Set<string>(body.fileIds.map((id: string) => id.toLowerCase()))]

        const result = await prisma.$transaction(async tx => {
            const files = await tx.files.findMany({
                where: {
                    id: {
                        in: fileIds
                    },
                    user_id: session.userId
                }
            })

            if (files.length !== fileIds.length) {
                throwError(404, 'One or more selected files could not be found.')
            }

            await tx.favorites.deleteMany({
                where: {
                    user_id: session.userId,
                    file_id: { in: fileIds }
                }
            })

            const trashIds: string[] = []

            for (const file of files) {
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

                trashIds.push(trashed.id)

                await tx.files.delete({
                    where: {
                        id: file.id,
                        user_id: session.userId
                    }
                })
            }

            return { deletedIds: files.map(file => file.id), trashIds }
        })

        return {
            success: true,
            ...result,
            failedIds: []
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Selected files could not be deleted.')
    }
})
