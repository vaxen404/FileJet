import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { assertShareOrigin } from '../../../../../utils/shares'
import { lockVersionedNote, writeNoteVersion } from '../../../../../utils/noteVersions'
import { throwError } from '../../../../../utils/error'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), noteId = inboxParam(event,'noteId'), id = inboxParam(event,'versionId'), body = await readBody(event)
    enforceRateLimit(event,`note-restore:${userId}`,30,60000)
    if (!Number.isSafeInteger(body?.revision) || body.revision < 1) throwError(400,'Invalid note revision.')
    const note = await prisma.$transaction(async tx => {
        const current = await lockVersionedNote(tx,userId,noteId,body.revision)
        const version = await tx.note_versions.findFirst({ where: { id, user_id: userId, note_id: noteId } })
        if (!version) throwError(404,'Note version not found.')
        const duplicate = await tx.notes.findFirst({ where: { user_id: userId, folder_id: current.folder_id, title: version.title, id: { not: noteId } }, select: { id: true } })
        if (duplicate) throwError(409,'A note with this title already exists. Rename it before restoring this version.')
        return writeNoteVersion(tx,current,version.title,version.content)
    })
    return { success: true, note: { ...note, size: note.size.toString() } }
})
