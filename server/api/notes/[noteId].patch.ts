import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { lockVersionedNote, writeNoteVersion } from '~~/server/utils/noteVersions'
import { noteSchema } from '~~/shared/schemas/note'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    enforceRateLimit(event, `notes-update:${session.userId}`, 120, 60000)
    const id = getRouterParam(event, 'noteId')

    if (!id || !isUuid(id)) throwError(400, 'Invalid note ID.')

    const body = await readBody(event)
    const parsed = noteSchema.safeParse(body)

    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid note.')
    if (body.expectedRevision !== undefined && (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1)) throwError(400, 'Invalid note revision.')

    try {
        const note = await prisma.$transaction(async tx => {
            const existing = await lockVersionedNote(tx, session.userId, id)
            if (existing.title === parsed.data.title && existing.content === parsed.data.content) return existing

            if (
                (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== (existing.updated_at?.toISOString() ?? null)) ||
                (body.expectedRevision !== undefined && body.expectedRevision !== existing.revision)
            ) {
                throwError(
                    409,
                    'This note changed in another session. Copy your draft before reloading.'
                )
            }

            const { title, content } = parsed.data

            if (
                await tx.notes.findFirst({
                    where: {
                        user_id: session.userId,
                        folder_id: existing.folder_id,
                        title,
                        id: { not: id }
                    }
                })
            )
                throwError(409, 'A note with this title already exists.')

            return writeNoteVersion(tx, existing, title, content)
        })

        return { success: true, note: { ...note, size: note.size.toString() } }
    } catch (error: any) {
        if (error.statusCode) throw error

        console.error('Note update failed:', error)
        throwError(500, 'Could not update note.')
    }
})
