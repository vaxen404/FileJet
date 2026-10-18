
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async ( event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `folders-rename:${session.userId}`, 10, 60 * 1000)

        const folderId = getRouterParam(event, 'folderId')

        if (!folderId || !isUuid(folderId)) {
            throwError(400, 'Invalid folder ID.')
        }

        const body = await readBody(event)

        const name = typeof body?.newName === 'string' ? body.newName.trim() : ''

        if (
            !name ||
            name === '.' ||
            name === '..' ||
            /[/\\\0]/.test(name) ||
            Buffer.byteLength(name, 'utf8') > 255
        ) {
            throwError(400, 'Invalid folder name.')
        }

        const folder = await prisma.$transaction(async ( tx) => {
            const existing = await tx.folders.findFirst({
                where: {
                    id: folderId,
                    user_id: session.userId
                }
            })

            if (!existing) {
                throwError(404, 'Folder not found.')
            }

            const duplicate = await tx.folders.findFirst({
                where: {
                    user_id: session.userId,
                    parent_folder_id: existing.parent_folder_id,
                    name: {
                        equals: name,
                        mode: 'insensitive'
                    },
                    id: {
                        not: folderId
                    }
                }
            })

            if (duplicate) {
                throwError(409, 'A folder with this name already exists.')
            }

            return tx.folders.update({
                where: {
                    id: folderId,
                    user_id: session.userId
                },
                data: {
                    name,
                    updated_at: new Date()
                }
            })
        })

        return {
            success: true,
            folder
        }
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error
        }

        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            throwError(409, 'A folder with this name already exists.')
        }

        console.error('[FOLDER RENAME ERROR]', error)

        throwError(500, 'Could not rename folder.')
    }
})
