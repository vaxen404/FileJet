import { prisma } from '../../utils/prisma'
import { inboxOwner, inboxParam, fileRequestView } from '../../utils/inbox'
import { throwError } from '../../utils/error'

export default defineEventHandler(async event => {
    const userId = inboxOwner(event)
    const id = inboxParam(event, 'id')
    const request = await prisma.file_requests.findFirst({ where: { id, user_id: userId } })
    if (!request) throwError(404, 'Inbox not found.')
    const [uploads, folder] = await Promise.all([
        prisma.request_uploads.findMany({
            where: { request_id: id, request: { user_id: userId } },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: 1000
        }),
        request.folder_id
            ? prisma.folders.findFirst({ where: { id: request.folder_id, user_id: userId }, select: { name: true } })
            : Promise.resolve(null)
    ])
    return {
        request: fileRequestView(event, request, folder?.name, uploads.filter(item => item.status === 'pending').length),
        uploads: uploads.map(item => ({
            id: item.id, requestId: id, requestTitle: request.title, fileId: item.file_id,
            name: item.name, senderName: item.sender_name, senderNote: item.sender_note, size: item.size.toString(), createdAt: item.created_at.toISOString(),
            status: item.status, reviewedAt: item.reviewed_at?.toISOString() ?? null, mimeType: item.mime_type
        }))
    }
})
