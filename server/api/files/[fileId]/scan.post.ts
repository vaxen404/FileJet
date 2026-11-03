import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { scanStoredFile } from '~~/server/utils/fileSecurity'
import { throwError } from '~~/server/utils/error'
import { assertShareOrigin } from '~~/server/utils/shares'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId')
    enforceRateLimit(event, `file-scan:${userId}`, 20, 60000)
    const file = await prisma.files.findFirst({ where: { id: fileId, user_id: userId }, select: { storage_key: true } })
    if (!file) throwError(404, 'File not found.')
    setHeader(event, 'Cache-Control', 'no-store')
    return scanStoredFile(userId, file.storage_key, true)
})
