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

        const noteId = getRouterParam(event, 'noteId')

        if (typeof noteId !== 'string' || !isUuid(noteId)) {
            throwError(400, 'Invalid note ID.')
        }

        const trashId = await prisma.$transaction(async tx => {
            const user = await tx.users.findFirst({
                where: {
                    id: session.userId
                }
            })

            if (!user) {
                throwError(401, 'Invalid session.')
            }

            const note = await tx.notes.findFirst({
                where: {
                    user_id: session.userId,
                    id: noteId
                }
            })

            if (!note) {
                throwError(404, 'Note not found.')
            }

            const trashed = await tx.trash.create({
                data: {
                    user_id: session.userId,
                    item_id: note.id,
                    item_type: 'note',
                    name: note.title,
                    content: note.content,
                    size: note.size,
                    folder_id: note.folder_id
                }
            })

            await tx.favorites.deleteMany({
                where: {
                    user_id: session.userId,
                    note_id: note.id
                }
            })

            await tx.shared_items.deleteMany({
                where: {
                    user_id: session.userId,
                    item_id: note.id,
                    item_type: 'note'
                }
            })

            await tx.notes.delete({
                where: {
                    user_id: session.userId,
                    id: note.id,
                    folder_id: note.folder_id
                }
            })

            return trashed.id
        })

        return {
            success: true,
            deletedIds: [noteId],
            failedIds: [],
            trashIds: [trashId]
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while deleting the note.')
    }
})
