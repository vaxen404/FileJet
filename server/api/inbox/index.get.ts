import { prisma } from '../../utils/prisma'
import { inboxOwner, fileRequestView } from '../../utils/inbox'

export default defineEventHandler(async event => {
    const userId = inboxOwner(event)
    const [requests, folders] = await prisma.$transaction([
        prisma.file_requests.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, include: { _count: { select: { uploads: { where: { status: 'pending' } } } } } }),
        prisma.folders.findMany({ where: { user_id: userId }, select: { id: true, name: true } })
    ])
    const names = new Map(folders.map(folder => [folder.id, folder.name]))
    return {
        requests: requests.map(item => fileRequestView(event, item, item.folder_id ? names.get(item.folder_id) : undefined, item._count.uploads))
    }
})
