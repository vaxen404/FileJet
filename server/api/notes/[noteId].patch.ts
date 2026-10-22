import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { lockStorageUser, reserveStorage } from '~~/server/utils/storage'
import { noteSchema } from '~~/shared/schemas/note'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    enforceRateLimit(event, `notes-update:${session.userId}`, 10, 60000)
    const id = getRouterParam(event, 'noteId')

    if (!id || !isUuid(id)) throwError(400, 'Invalid note ID.')

    const body = await readBody(event)
    const parsed = noteSchema.safeParse(body)

    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid note.')

    try {
        const note = await prisma.$transaction(async tx => {
            await lockStorageUser(tx, session.userId)
            const existing = await tx.notes.findFirst({ where: { id, user_id: session.userId } })

            if (!existing) throwError(404, 'Note not found.')

            if (
                body.expectedUpdatedAt !== undefined &&
                body.expectedUpdatedAt !== (existing.updated_at?.toISOString() ?? null)
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

            const size = BigInt(Buffer.byteLength(content, 'utf8'))
            await reserveStorage(tx, session.userId, size - existing.size)

            return tx.notes.update({
                where: { id, user_id: session.userId },
                data: { title, content, size, updated_at: new Date() }
            })
        })

        return { success: true, note: { ...note, size: note.size.toString() } }
    } catch (error: any) {
        if (error.statusCode) throw error

        console.error('Note update failed:', error)
        throwError(500, 'Could not update note.')
    }
})
