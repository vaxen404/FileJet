import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"
import { resolve, isAbsolute, join, sep } from "node:path"
import { unlink } from "node:fs/promises"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `folder-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (
            !body ||
            typeof body !== 'object' ||
            typeof body.folderId !== 'string' ||
            !isUuid(body.folderId)
        ) {
            throwError(400, 'Invalid folder ID.')
            return
        }

        const folder = await prisma.folders.findFirst({
            where: {
                id: body.folderId,
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

        const files = await prisma.files.findMany({
            where: {
                user_id: session.userId,
                folder_id: {
                    in: ids
                }
            },
            select: {
                id: true,
                size: true,
                storage_key: true
            }
        })

        const notes = await prisma.notes.findMany({
            where: {
                user_id: session.userId,
                folder_id: {
                    in: ids
                }
            },
            select: {
                id: true,
                size: true
            }
        })

        const filesSize = files.reduce(
            (total, file) => total + file.size,
            0n
        )

        const notesSize = notes.reduce(
            (total, note) => total + note.size,
            0n
        )

        const totalSize = filesSize + notesSize

        const fileIds = files.map(file => file.id)
        const noteIds = notes.map(note => note.id)

        const storageDirectory = resolve(
            process.cwd(),
            'storage'
        )

        const storagePaths: string[] = []

        for (const file of files) {
            const key = file.storage_key

            if (
                !key ||
                isAbsolute(key) ||
                /^[A-Za-z]:/.test(key)
            ) {
                throwError(500, 'Invalid storage path.')
            }

            const filePath = resolve(storageDirectory, key)

            if (!filePath.startsWith(storageDirectory + sep)) {
                throwError(500, 'Invalid storage path.')
            }

            storagePaths.push(filePath)
        }

        await prisma.$transaction(async (tx) => {
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

            const user = await tx.users.findUnique({
                where: {
                    id: session.userId
                },
                select: {
                    storage_used: true
                }
            })

            if (!user) {
                throwError(401, 'Invalid session.')
            }

            const currentUsed = user.storage_used ?? 0n

            await tx.users.update({
                where: {
                    id: session.userId
                },
                data: {
                    storage_used: 
                        currentUsed > totalSize 
                            ? currentUsed - totalSize
                            : 0n
                }
            })
        })

        let failedFileDeletions = 0

        for (const filePath of storagePaths) {
            try {
                await unlink(filePath)
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    failedFileDeletions++

                    console.error(
                        '[FOLDER DELETE STORAGE ERROR]',
                        err
                    )
                }
            }
        }

        return {
            success: true,
            message: 'Folder deleted successfully.',
            foldersDeleted: ids.length,
            filesDeleted: files.length,
            notesDeleted: notes.length,
            storageFreed: totalSize.toString(),
            failedFileDeletions
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        console.error('[FOLDER DELETE ERROR]', err)

        throwError(500, 'An unknown error occurred while deleting the folder.')
    }
})