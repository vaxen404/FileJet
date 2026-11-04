import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { throwError } from '../../../../../utils/error'
export default defineEventHandler(async event => {
    const userId = inboxOwner(event), noteId = inboxParam(event,'noteId'), id = inboxParam(event,'versionId')
    const note = await prisma.notes.findFirst({ where: { id: noteId, user_id: userId }, select: { id: true } })
    const version = note && await prisma.note_versions.findFirst({ where: { id, user_id: userId, note_id: noteId } })
    if (!version) throwError(404,'Note version not found.')
    return { id: version.id, revision: version.revision, title: version.title, content: version.content, size: version.size.toString(), createdAt: version.created_at.toISOString() }
})
