import { prisma } from '../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../utils/inbox'
import { throwError } from '../../../../utils/error'
import { NOTE_HISTORY_LIMIT } from '../../../../utils/noteVersions'
export default defineEventHandler(async event => {
    const userId = inboxOwner(event), noteId = inboxParam(event,'noteId')
    return prisma.$transaction(async tx => {
        const note = await tx.notes.findFirst({ where: { id: noteId, user_id: userId }, select: { revision: true } })
        if (!note) throwError(404,'Note not found.')
        const versions = await tx.note_versions.findMany({ where: { user_id: userId, note_id: noteId }, orderBy: { revision: 'desc' }, take: NOTE_HISTORY_LIMIT, select: { id: true, revision: true, title: true, size: true, created_at: true } })
        return { revision: note.revision, limit: NOTE_HISTORY_LIMIT, versions: versions.map(version => ({ id: version.id, revision: version.revision, title: version.title, size: version.size.toString(), createdAt: version.created_at.toISOString() })) }
    },{ isolationLevel: 'RepeatableRead' })
})
