import { getPublicShare } from '../../../utils/shares'
import { assertShareAccess } from '../../../utils/shareSecurity'
import { enforceRateLimit } from '../../../utils/rateLimit'
import { prisma } from '~~/server/utils/prisma'
import { throwError } from '~~/server/utils/error'

export default defineEventHandler(async event => {
    try {
        const sharedItem = await getPublicShare(event, false)
        enforceRateLimit(event, `shared-public:${sharedItem.token}`, 60, 60 * 1000)

        try {
            assertShareAccess(event, sharedItem)
        } catch (err: any) {
            if (err.statusCode !== 401) throw err

            const itemName =
                sharedItem.item_type === 'file'
                    ? await prisma.files.findFirst({
                          where: { id: sharedItem.item_id, user_id: sharedItem.user_id },
                          select: { name: true, original_name: true }
                      }).then(item => item ? item.original_name || item.name : null)
                    : sharedItem.item_type === 'folder'
                      ? await prisma.folders.findFirst({
                            where: { id: sharedItem.item_id, user_id: sharedItem.user_id },
                            select: { name: true }
                        }).then(item => item?.name ?? null)
                      : sharedItem.item_type === 'note'
                        ? await prisma.notes.findFirst({
                              where: { id: sharedItem.item_id, user_id: sharedItem.user_id },
                              select: { title: true }
                          }).then(item => item?.title ?? null)
                        : null

            if (itemName === null) throwError(404, 'Shared item not found.')

            throwError(401, 'A password is required for this share link.', {
                data: {
                    passwordRequired: true,
                    fileName: sharedItem.item_type === 'file' ? itemName : null,
                    itemName,
                    itemType: sharedItem.item_type
                }
            })
        }

        if (sharedItem.item_type === 'file') {
            const file = await prisma.files.findFirst({
                where: {
                    id: sharedItem.item_id,
                    user_id: sharedItem.user_id
                },
                select: {
                    id: true,
                    name: true,
                    original_name: true,
                    mime_type: true,
                    size: true,
                    created_at: true,
                    updated_at: true
                }
            })

            if (!file) {
                throwError(404, 'File not found.')
            }

            return {
                type: 'file',
                isPasswordProtected: Boolean(sharedItem.password_hash),
                sharedBy: sharedItem.users.username,
                item: {
                    ...file,
                    size: file.size.toString()
                }
            }
        }

        if (sharedItem.item_type === 'folder') {
            const folder = await prisma.folders.findFirst({
                where: {
                    id: sharedItem.item_id,
                    user_id: sharedItem.user_id
                },
                select: {
                    id: true,
                    name: true,
                    created_at: true,
                    updated_at: true
                }
            })

            if (!folder) {
                throwError(404, 'Folder not found.')
            }

            return {
                type: 'folder',
                isPasswordProtected: Boolean(sharedItem.password_hash),
                sharedBy: sharedItem.users.username,
                item: folder
            }
        }

        if (sharedItem.item_type === 'note') {
            const note = await prisma.notes.findFirst({
                where: {
                    id: sharedItem.item_id,
                    user_id: sharedItem.user_id
                },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    size: true,
                    created_at: true,
                    updated_at: true
                }
            })

            if (!note) {
                throwError(404, 'Note not found.')
            }

            return {
                type: 'note',
                isPasswordProtected: Boolean(sharedItem.password_hash),
                sharedBy: sharedItem.users.username,
                item: {
                    ...note,
                    size: note.size.toString()
                }
            }
        }

        throwError(400, 'Invalid shared item type.')
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the share item.')
    }
})
