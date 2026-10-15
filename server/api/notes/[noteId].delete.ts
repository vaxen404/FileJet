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

        enforceRateLimit(event, `note-delete:${session.userId}`, 10, 60 * 1000)

        const noteId = getRouterParam(event, 'noteId')

        if (
            typeof noteId !== 'string' ||
            !isUuid(noteId)
        ) {
            throwError(400, 'Invalid note ID.')
        }

        await prisma.$transaction(async (tx) => {
            const user = await tx.users.findFirst({
                where: {
                    id: session.userId
                },
                select: {
                    storage_used: true
                }
            })

            if (!user) {
                throwError(401, 'Invalid session.')
            }

            const existingNote = await tx.notes.findFirst({
                where: {
                    user_id: session.userId,
                    id: noteId
                }
            })

            if (!existingNote) {
                throwError(404, 'Note not found.')
            }

            const note = await tx.notes.deleteMany({
                where: {
                    user_id: session.userId,
                    id: noteId
                }
            })

            if (note.count !== 1) {
                throwError(404, 'Note not found.')
            }

            const storageUsed = user.storage_used ?? 0n

            if (storageUsed < existingNote.size) {
                throwError(409, 'Storage usage is inconsistent.')
            }

            const updated = await tx.users.updateMany({
                where: {
                    id: session.userId,
                    storage_used: user.storage_used
                },
                data: {
                    storage_used: storageUsed - existingNote.size
                }
            })

            if (updated.count !== 1) {
                throwError(409, 'Storage changed. Please try again.')
            }
        })

        return {
            success: true
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while deleting the note.')
    }
})