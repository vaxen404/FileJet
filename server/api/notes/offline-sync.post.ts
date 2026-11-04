import { prisma } from '../../utils/prisma'
import { inboxOwner } from '../../utils/inbox'
import { assertShareOrigin } from '../../utils/shares'
import { lockStorageUser, reserveStorage } from '../../utils/storage'
import { throwError } from '../../utils/error'
import { isUuid } from '../../utils/validation'
import { noteSchema } from '../../../shared/schemas/note'
import { writeNoteVersion } from '../../utils/noteVersions'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event)
    enforceRateLimit(event, `notes-offline:${userId}`, 120, 60000)
    const body = await readBody(event), parsed = noteSchema.safeParse(body)
    if (!parsed.success) throwError(400, parsed.error.issues[0]?.message ?? 'Invalid note.')
    if (!isUuid(body.id) || typeof body.isNew !== 'boolean' || !(body.baseUpdatedAt === null || typeof body.baseUpdatedAt === 'string')) throwError(400, 'Invalid offline note.')
    if (body.baseRevision !== undefined && (!Number.isSafeInteger(body.baseRevision) || body.baseRevision < 1)) throwError(400, 'Invalid note revision.')
    const { title, content } = parsed.data, size = BigInt(Buffer.byteLength(content, 'utf8'))
    const note = await prisma.$transaction(async tx => {
        await lockStorageUser(tx, userId)
        const existing = await tx.notes.findUnique({ where: { id: body.id } })
        if (existing && existing.user_id !== userId) throwError(404, 'Note not found.')
        if (existing && existing.title === title && existing.content === content) return existing // Lost-response retry.
        if (body.isNew ? !!existing : !existing) throwError(body.isNew ? 409 : 404, body.isNew ? 'This note already exists. Keep your draft and save a copy.' : 'The original note was deleted or moved to Trash. Save your draft as a new note.')
        if (existing && body.baseUpdatedAt !== (existing.updated_at?.toISOString() ?? null)) throwError(409, 'This note changed on the server. Your offline draft is preserved.')
        if (existing && body.baseRevision !== undefined && existing.revision !== body.baseRevision) throwError(409, 'This note changed on the server. Your offline draft is preserved.')
        if (await tx.notes.findFirst({ where: { user_id: userId, folder_id: existing?.folder_id ?? null, title, id: { not: body.id } } })) throwError(409, 'A note with this title already exists. Rename your offline draft.')
        if (existing) return writeNoteVersion(tx, existing, title, content)
        await reserveStorage(tx, userId, size)
        return tx.notes.create({ data: { id: body.id, user_id: userId, title, content, size } })
    })
    setHeader(event, 'Cache-Control', 'no-store')
    return { id: note.id, title: note.title, content: note.content, revision: note.revision, updated_at: note.updated_at?.toISOString() ?? null }
})
