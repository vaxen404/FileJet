import { prisma } from '../../utils/prisma'
import { getAuthSession } from '../../utils/auth'
import { isUuid } from '../../utils/validation'
import { shareState } from '../../utils/shares'
import { getFolderContents, getFolderTree } from '../../utils/folderContents'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throw createError({ statusCode: 401, message: 'You need to be logged in.' })

    const id = getRouterParam(event, 'folderId')

    if (!id || !isUuid(id)) throw createError({ statusCode: 400, message: 'Invalid folder ID.' })

    const folder = await prisma.folders.findFirst({ where: { id, user_id: session.userId } })

    if (!folder) throw createError({ statusCode: 404, message: 'Folder not found.' })

    const [contents, tree, parent, share] = await Promise.all([
        getFolderContents(session.userId, id),
        getFolderTree(session.userId, id),
        folder.parent_folder_id
            ? prisma.folders.findFirst({
                  where: { id: folder.parent_folder_id, user_id: session.userId },
                  select: { id: true, name: true }
              })
            : null,
        prisma.shared_items.findFirst({
            where: { user_id: session.userId, item_id: id, item_type: 'folder' }
        })
    ])

    const where = { user_id: session.userId, folder_id: { in: tree } }

    const [files, notes] = await Promise.all([
        prisma.files.aggregate({ where, _sum: { size: true } }),
        prisma.notes.aggregate({ where, _sum: { size: true } })
    ])

    setHeader(event, 'Cache-Control', 'no-store')

    return {
        ...folder,
        ...contents,
        parent,
        totalSize: ((files._sum.size ?? 0n) + (notes._sum.size ?? 0n)).toString(),
        share: shareState(event, share)
    }
})
