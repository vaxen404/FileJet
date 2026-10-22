import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { unlink } from 'node:fs/promises'
import path from 'node:path'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `trash-delete:${session.userId}`, 10, 60 * 1000)

        const itemId = getRouterParam(event, 'itemId')

        if (!itemId || !isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }

        let storageKeys: string[] = []

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                storageKeys = await prisma.$transaction(
                    async tx => {
                        const item = await tx.trash.findFirst({
                            where: {
                                id: itemId,
                                user_id: session.userId
                            }
                        })

                        if (!item) {
                            throwError(404, 'Item not found.')
                        }

                        if (!['file', 'note', 'folder'].includes(item.item_type)) {
                            throwError(400, 'Unsupported item type.')
                        }

                        let items = [item]

                        if (item.item_type === 'folder') {
                            const trashItems = item.root_folder_id
                                ? await tx.trash.findMany({
                                      where: {
                                          user_id: session.userId,
                                          root_folder_id: item.root_folder_id
                                      }
                                  })
                                : [item]

                            const folderIds = new Set<string>([item.item_id])

                            let changed = true

                            while (changed) {
                                changed = false

                                for (const folder of trashItems) {
                                    if (
                                        folder.item_type === 'folder' &&
                                        folder.parent_folder_id &&
                                        folderIds.has(folder.parent_folder_id) &&
                                        !folderIds.has(folder.item_id)
                                    ) {
                                        folderIds.add(folder.item_id)
                                        changed = true
                                    }
                                }
                            }

                            items = trashItems.filter(
                                entry =>
                                    entry.id === item.id ||
                                    (entry.item_type === 'folder' &&
                                        folderIds.has(entry.item_id)) ||
                                    ((entry.item_type === 'file' || entry.item_type === 'note') &&
                                        entry.folder_id !== null &&
                                        folderIds.has(entry.folder_id))
                            )

                            if (!items.some(entry => entry.id === item.id)) {
                                throwError(409, 'Folder is missing from trash.')
                            }
                        }

                        let totalSize = 0n
                        const keys: string[] = []

                        for (const entry of items) {
                            if (!['file', 'note', 'folder'].includes(entry.item_type)) {
                                throwError(409, 'Invalid trash item type.')
                            }

                            if (entry.item_type === 'folder') {
                                continue
                            }

                            if (entry.size === null || entry.size < 0n) {
                                throwError(409, 'Item size is invalid.')
                            }

                            totalSize += entry.size

                            if (entry.item_type === 'file') {
                                const key = entry.storage_key

                                if (!key) {
                                    throwError(409, 'File storage key is missing.')
                                }

                                if (
                                    key === '.' ||
                                    key === '..' ||
                                    path.basename(key) !== key ||
                                    key.includes('/') ||
                                    key.includes('\\') ||
                                    key.includes('\0')
                                ) {
                                    throwError(409, 'Invalid storage key.')
                                }

                                keys.push(key)
                            }
                        }

                        const user = await tx.users.findUnique({
                            where: {
                                id: session.userId
                            },
                            select: {
                                storage_used: true
                            }
                        })

                        if (!user) {
                            throwError(404, 'User not found.')
                        }

                        if (user.storage_used === null || user.storage_used < totalSize) {
                            throwError(409, 'Invalid storage usage.')
                        }

                        if (totalSize > 0n) {
                            const updated = await tx.users.updateMany({
                                where: {
                                    id: session.userId,
                                    storage_used: {
                                        gte: totalSize
                                    }
                                },
                                data: {
                                    storage_used: {
                                        decrement: totalSize
                                    }
                                }
                            })

                            if (updated.count !== 1) {
                                throwError(409, 'Storage usage has changed.')
                            }
                        }

                        if (item.item_type === 'folder') {
                            const deleted = await tx.trash.deleteMany({
                                where: {
                                    user_id: session.userId,
                                    id: {
                                        in: items.map(entry => entry.id)
                                    }
                                }
                            })

                            if (deleted.count !== items.length) {
                                throwError(409, 'Trash contents have changed.')
                            }
                        } else {
                            await tx.trash.delete({
                                where: {
                                    id: item.id,
                                    user_id: session.userId
                                }
                            })
                        }

                        return keys
                    },
                    {
                        isolationLevel: 'Serializable',
                        maxWait: 5000,
                        timeout: 30000
                    }
                )

                break
            } catch (err: any) {
                if (err.code === 'P2034' && attempt < 2) {
                    continue
                }

                throw err
            }
        }

        let diskDeleted = true

        for (const storageKey of storageKeys) {
            const filePath = path.join(process.cwd(), 'storage', session.userId, storageKey)

            try {
                await unlink(filePath)
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    diskDeleted = false
                    console.error('Failed to delete file from disk:', filePath, err)
                }
            }
        }

        return {
            success: true,
            diskDeleted
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        if (err.code === 'P2025') {
            throwError(404, 'Item not found.')
        }

        if (err.code === 'P2034') {
            throwError(409, 'Transaction conflict. Please try again.')
        }

        console.error('Trash permanent deletion failed:', err)

        throwError(500, 'An unexpected error occurred while permanently deleting the item.')
    }
})
