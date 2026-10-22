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

        enforceRateLimit(event, `note-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)
        const ids = body?.ids

        if (
            !Array.isArray(ids) ||
            ids.length < 1 ||
            ids.length > 200 ||
            ids.some(id => typeof id !== 'string' || !isUuid(id))
        ) {
            throwError(400, 'Invalid note IDs.')
        }

        const noteIds = [...new Set<string>(ids)]

        const trashIds = await prisma.$transaction(async tx => {
            const notes = await tx.notes.findMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: noteIds
                    }
                }
            })

            if (notes.length !== noteIds.length) {
                throwError(404, 'One or more notes not found.')
            }

            await tx.trash.createMany({
                data: notes.map(note => ({
                    user_id: session.userId,
                    item_id: note.id,
                    item_type: 'note',
                    name: note.title,
                    content: note.content,
                    size: note.size,
                    folder_id: note.folder_id
                }))
            })

            await tx.favorites.deleteMany({
                where: {
                    user_id: session.userId,
                    note_id: { in: noteIds }
                }
            })

            await tx.shared_items.deleteMany({
                where: {
                    user_id: session.userId,
                    item_id: {
                        in: noteIds
                    },
                    item_type: 'note'
                }
            })

            const deleted = await tx.notes.deleteMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: noteIds
                    }
                }
            })

            if (deleted.count !== noteIds.length) {
                throwError(409, 'Notes changed during deletion.')
            }

            const trashed = await tx.trash.findMany({
                where: {
                    user_id: session.userId,
                    item_type: 'note',
                    item_id: { in: noteIds }
                },
                select: { id: true }
            })

            return trashed.map(item => item.id)
        })

        return {
            success: true,
            deletedIds: noteIds,
            failedIds: [],
            trashIds
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while deleting the note.')
    }
})
