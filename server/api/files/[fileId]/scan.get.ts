import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { getFileScan } from '~~/server/utils/fileSecurity'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async event => {
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId')
    const file = await prisma.files.findFirst({ where: { id: fileId, user_id: userId }, select: { storage_key: true } })
    if (!file) throwError(404, 'File not found.')
    setHeader(event, 'Cache-Control', 'no-store')
    return getFileScan(userId, file.storage_key)
})
