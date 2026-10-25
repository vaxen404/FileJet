import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `folder-delete:${session.userId}`, 10, 60 * 1000)

        const folderId = getRouterParam(event, 'folderId')

        if (typeof folderId !== 'string' || !isUuid(folderId)) {
            throwError(400, 'Invalid folder ID.')
        }

        let result:
            | {
                  trashIds: string[]
                  foldersDeleted: number
                  filesDeleted: number
                  notesDeleted: number
              }
            | undefined

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await prisma.$transaction(
                    async tx => {
                        const folder = await tx.folders.findFirst({
                            where: {
                                id: folderId,
                                user_id: session.userId
                            }
                        })

                        if (!folder) {
                            throwError(404, 'Folder not found.')
                        }

                        const folderIds = new Set<string>([folder.id])
                        let pendingIds = [folder.id]

                        while (pendingIds.length > 0) {
                            const children = await tx.folders.findMany({
                                where: {
                                    user_id: session.userId,
                                    parent_folder_id: {
                                        in: pendingIds
                                    }
                                },
                                select: {
                                    id: true
                                }
                            })

                            const nextIds: string[] = []

                            for (const child of children) {
                                if (!folderIds.has(child.id)) {
                                    folderIds.add(child.id)
                                    nextIds.push(child.id)
                                }
                            }

                            pendingIds = nextIds
                        }

                        const ids = [...folderIds]

                        const folders = await tx.folders.findMany({
                            where: {
                                id: { in: ids },
                                user_id: session.userId
                            }
                        })

                        const files = await tx.files.findMany({
                            where: {
                                user_id: session.userId,
                                folder_id: { in: ids }
                            }
                        })

                        const notes = await tx.notes.findMany({
                            where: {
                                user_id: session.userId,
                                folder_id: { in: ids }
                            }
                        })

                        const fileIds = files.map(file => file.id)
                        const noteIds = notes.map(note => note.id)

                        await tx.trash.createMany({
                            data: folders.map(folder => ({
                                user_id: session.userId,
                                item_id: folder.id,
                                item_type: 'folder',
                                name: folder.name,
                                parent_folder_id: folder.parent_folder_id,
                                root_folder_id: folderId
                            }))
                        })

                        if (files.length > 0) {
                            await tx.trash.createMany({
                                data: files.map(file => ({
                                    user_id: session.userId,
                                    item_id: file.id,
                                    item_type: 'file',
                                    name: file.name,
                                    original_name: file.original_name,
                                    mime_type: file.mime_type,
                                    size: file.size,
                                    storage_key: file.storage_key,
                                    folder_id: file.folder_id,
                                    root_folder_id: folderId
                                }))
                            })
                        }

                        if (notes.length > 0) {
                            await tx.trash.createMany({
                                data: notes.map(note => ({
                                    user_id: session.userId,
                                    item_id: note.id,
                                    item_type: 'note',
                                    name: note.title,
                                    content: note.content,
                                    size: note.size,
                                    folder_id: note.folder_id,
                                    root_folder_id: folderId
                                }))
                            })
                        }

                        await tx.favorites.deleteMany({
                            where: {
                                user_id: session.userId,
                                OR: [
                                    { folder_id: { in: ids } },
                                    { file_id: { in: fileIds } },
                                    { note_id: { in: noteIds } }
                                ]
                            }
                        })

                        await tx.folders.delete({
                            where: {
                                id: folder.id,
                                user_id: session.userId
                            }
                        })

                        const trashed = await tx.trash.findMany({
                            where: {
                                user_id: session.userId,
                                item_type: 'folder',
                                item_id: folder.id
                            },
                            select: { id: true }
                        })

                        return {
                            trashIds: trashed.map(item => item.id),
                            foldersDeleted: ids.length,
                            filesDeleted: files.length,
                            notesDeleted: notes.length
                        }
                    },
                    {
                        maxWait: 5000,
                        timeout: 60000,
                        isolationLevel: 'Serializable'
                    }
                )

                break
            } catch (err: unknown) {
                const isConflict =
                    err !== null && typeof err === 'object' && 'code' in err && err.code === 'P2034'

                if (!isConflict || attempt === 3) {
                    throw err
                }
            }
        }

        if (!result) {
            throwError(500, 'Folder operation failed.')
        }

        return {
            success: true,
            message: 'Folder moved to trash successfully.',
            deletedIds: [folderId],
            failedIds: [],
            ...result
        }
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err) {
            throw err
        }

        console.error('[FOLDER TRASH ERROR]', err)

        throwError(500, 'An unknown error occurred while moving the folder to trash.')
    }
})
