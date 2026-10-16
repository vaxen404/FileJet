import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `folder-delete:${session.userId}`, 10, 60 * 1000)

        const folderId = getRouterParam(event, 'folderId')

        if (
            typeof folderId !== 'string' ||
            !isUuid(folderId)
        ) {
            throwError(400, 'Invalid folder ID.')
        }

        const folder = await prisma.folders.findFirst({
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
            const children = await prisma.folders.findMany({
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

        const folders = await prisma.folders.findMany({
            where: {
                id: {
                    in: ids
                },
                user_id: session.userId
            }
        })

        const files = await prisma.files.findMany({
            where: {
                user_id: session.userId,
                folder_id: {
                    in: ids
                }
            }
        })

        const notes = await prisma.notes.findMany({
            where: {
                user_id: session.userId,
                folder_id: {
                    in: ids
                }
            }
        })

        const fileIds = files.map(file => file.id)
        const noteIds = notes.map(note => note.id)


        await prisma.$transaction(async (tx) => {
            for (const folder of folders) {
                await tx.trash.create({
                    data: {
                        user_id: session.userId,
                        item_id: folder.id,
                        item_type: 'folder',
                        name: folder.name,
                        parent_folder_id: folder.parent_folder_id
                    }
                })
            }

            for (const file of files) {
                await tx.trash.create({
                    data: {
                        user_id: session.userId,
                        item_id: file.id,
                        item_type: 'file',
                        name: file.name,
                        original_name: file.original_name,
                        mime_type: file.mime_type,
                        size: file.size,
                        storage_key: file.storage_key,
                        folder_id: file.folder_id
                    }
                })
            }

            for (const note of notes) {
                await tx.trash.create({
                    data: {
                        user_id: session.userId,
                        item_id: note.id,
                        item_type: 'note',
                        name: note.title,
                        content: note.content,
                        size: note.size,
                        folder_id: note.folder_id
                    }
                })
            }

            await tx.shared_items.deleteMany({
                where: {
                    user_id: session.userId,
                    OR: [
                        {
                            item_type: 'folder',
                            item_id: { in: ids }
                        },
                        {
                            item_type: 'file',
                            item_id: { in: fileIds }
                        },
                        {
                            item_type: 'note',
                            item_id: { in: noteIds }
                        }
                    ]
                }
            })

            await tx.folders.delete({
                where: {
                    id: folder.id,
                    user_id: session.userId
                }
            })

        })

        return {
            success: true,
            message: 'Folder deleted successfully.',
            foldersDeleted: ids.length,
            filesDeleted: files.length,
            notesDeleted: notes.length
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while deleting the folder.')
    }
})