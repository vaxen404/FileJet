import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { resolveTrashStoragePath } from '~~/server/utils/trashStorage'
import { throwError } from '~~/server/utils/error'
export default defineEventHandler(async event => {
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId'), versionId = inboxParam(event, 'versionId')
    const file = await prisma.files.findFirst({ where: { id: fileId, user_id: userId }, select: { id: true } })
    const version = file ? await prisma.file_versions.findFirst({ where: { id: versionId, file_id: fileId, user_id: userId } }) : null
    if (!version) throwError(404, 'Version not found.')
    const path = resolveTrashStoragePath(userId, version.storage_key), content = await stat(path).catch(() => null)
    if (!content?.isFile()) throwError(404, 'Stored version not found.')
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Content-Length', content.size)
    setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(version.name)}`)
    return sendStream(event, createReadStream(path))
})
