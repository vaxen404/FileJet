import { unlink } from 'node:fs/promises'
import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { lockVersionedFile } from '~~/server/utils/fileVersions'
import { resolveTrashStoragePath } from '~~/server/utils/trashStorage'
import { reserveStorage } from '~~/server/utils/storage'
import { assertShareOrigin } from '~~/server/utils/shares'
import { throwError } from '~~/server/utils/error'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId'), versionId = inboxParam(event, 'versionId')
    const key = await prisma.$transaction(async tx => {
        await lockVersionedFile(tx, userId, fileId)
        const version = await tx.file_versions.findFirst({ where: { id: versionId, file_id: fileId, user_id: userId } })
        if (!version) throwError(404, 'Version not found.')
        resolveTrashStoragePath(userId, version.storage_key)
        await reserveStorage(tx, userId, -version.size)
        await tx.file_versions.delete({ where: { id: version.id } })
        return version.storage_key
    })
    await unlink(resolveTrashStoragePath(userId, key)).catch(error => { if (error.code !== 'ENOENT') console.error('[VERSION CLEANUP]', error) })
    return { success: true }
})
