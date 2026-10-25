import { throwError } from './error'
import { getQuery, type H3Event } from 'h3'
import { getPublicShare } from './shares'
import { prisma } from './prisma'
import { isUuid } from './validation'
import { requireFolderWithin } from './folderContents'

export async function getSharedTarget(event: H3Event) {
    const share = await getPublicShare(event)
    let id = share.item_id
    let type = share.item_type

    if (type === 'folder') {
        const query = getQuery(event)

        if (query.itemId !== undefined) {
            if (
                typeof query.itemId !== 'string' ||
                !isUuid(query.itemId) ||
                !['file', 'folder', 'note'].includes(String(query.itemType))
            ) {
                throwError(400, 'Invalid shared item.')
            }

            id = query.itemId
            type = String(query.itemType)
        }
    }

    const where = { id, user_id: share.user_id }

    const item =
        type === 'file'
            ? await prisma.files.findFirst({ where })
            : type === 'note'
              ? await prisma.notes.findFirst({ where })
              : type === 'folder'
                ? await prisma.folders.findFirst({ where })
                : null

    if (!item) throwError(404, 'Shared item not found.')

    if (share.item_type === 'folder') {
        const folderId = type === 'folder' ? item.id : 'folder_id' in item ? item.folder_id : null

        if (!folderId)
            throwError(404, 'Item not found in this shared folder.')

        await requireFolderWithin(share.user_id, share.item_id, folderId)
    }

    return { share, id, type, item }
}
