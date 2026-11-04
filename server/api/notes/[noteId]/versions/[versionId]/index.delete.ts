import { prisma } from '../../../../../utils/prisma'
import { inboxOwner, inboxParam } from '../../../../../utils/inbox'
import { assertShareOrigin } from '../../../../../utils/shares'
import { lockVersionedNote } from '../../../../../utils/noteVersions'
import { reserveStorage } from '../../../../../utils/storage'
import { throwError } from '../../../../../utils/error'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), noteId = inboxParam(event,'noteId'), id = inboxParam(event,'versionId')
    enforceRateLimit(event,`note-version-delete:${userId}`,60,60000)
    await prisma.$transaction(async tx => {
        await lockVersionedNote(tx,userId,noteId)
        const version = await tx.note_versions.findFirst({ where: { id, user_id: userId, note_id: noteId } })
        if (!version) throwError(404,'Note version not found.')
        await reserveStorage(tx,userId,-version.size)
        await tx.note_versions.delete({ where: { id } })
    })
    return { success: true }
})
