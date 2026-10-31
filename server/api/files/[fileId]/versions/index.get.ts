import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { throwError } from '~~/server/utils/error'
export default defineEventHandler(async event => {
    const userId = inboxOwner(event), fileId = inboxParam(event, 'fileId')
    const file = await prisma.files.findFirst({ where: { id: fileId, user_id: userId }, select: { revision: true } })
    if (!file) throwError(404, 'File not found.')
    const versions = await prisma.file_versions.findMany({ where: { file_id: fileId, user_id: userId }, orderBy: { revision: 'desc' }, take: 50 })
    return { revision: file.revision, versions: versions.map(item => ({ id: item.id, revision: item.revision, name: item.name, mimeType: item.mime_type, size: item.size.toString(), createdAt: item.created_at.toISOString() })) }
})
