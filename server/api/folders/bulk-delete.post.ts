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

        const body = await readBody(event)
        const ids = body?.ids

        if (
            !Array.isArray(ids) ||
            ids.length < 1 ||
            ids.length > 200 ||
            ids.some(id => typeof id !== 'string' || !isUuid(id))
        ) {
            throwError(400, 'Invalid folder IDs.')
        }

        const folderIds = [...new Set<string>(ids)]

        const trashIds = await prisma.$transaction(async tx => {
            const folders = await tx.folders.findMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: folderIds
                    }
                }
            })

            if (folders.length !== folderIds.length) {
                throwError(404, 'One or more folders not found.')
            }

            const allFolderIds = new Set<string>(folderIds)
            let pendingIds = [...folderIds]

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
                    if (!allFolderIds.has(child.id)) {
                        allFolderIds.add(child.id)
                        nextIds.push(child.id)
                    }
                }

                pendingIds = nextIds
            }

            const ids = [...allFolderIds]

            const allFolders = await tx.folders.findMany({
                where: {
                    user_id: session.userId,
                    id: { in: ids }
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

            const folderMap = new Map(allFolders.map(folder => [folder.id, folder]))

            const selectedIds = new Set(folderIds)

            const getRootId = (folderId: string): string => {
                let currentId = folderId
                let rootId: string | null = null
                const visited = new Set<string>()

                while (true) {
                    if (visited.has(currentId)) {
                        throwError(400, 'Invalid folder hierarchy.')
                    }

                    visited.add(currentId)

                    if (selectedIds.has(currentId)) {
                        rootId = currentId
                    }

                    const folder = folderMap.get(currentId)

                    if (!folder?.parent_folder_id || !folderMap.has(folder.parent_folder_id)) {
                        break
                    }

                    currentId = folder.parent_folder_id
                }

                if (!rootId) {
                    throwError(400, 'Invalid folder hierarchy.')
                }

                return rootId
            }

            await tx.trash.createMany({
                data: allFolders.map(folder => ({
                    user_id: session.userId,
                    item_id: folder.id,
                    item_type: 'folder',
                    name: folder.name,
                    parent_folder_id: folder.parent_folder_id,
                    root_folder_id: getRootId(folder.id)
                }))
            })

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
                    root_folder_id: getRootId(file.folder_id!)
                }))
            })

            await tx.trash.createMany({
                data: notes.map(note => ({
                    user_id: session.userId,
                    item_id: note.id,
                    item_type: 'note',
                    name: note.title,
                    content: note.content,
                    size: note.size,
                    folder_id: note.folder_id,
                    root_folder_id: getRootId(note.folder_id!)
                }))
            })

            const fileIds = files.map(file => file.id)
            const noteIds = notes.map(note => note.id)

            const rootIds = folderIds.filter(id => getRootId(id) === id)

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

            const deleted = await tx.folders.deleteMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: rootIds
                    }
                }
            })

            if (deleted.count !== rootIds.length) {
                throwError(409, 'folders changed during deletion.')
            }

            const trashed = await tx.trash.findMany({
                where: {
                    user_id: session.userId,
                    item_type: 'folder',
                    item_id: { in: rootIds }
                },
                select: { id: true }
            })

            return trashed.map(item => item.id)
        })

        return {
            success: true,
            deletedIds: folderIds,
            failedIds: [],
            trashIds
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while deleting the folder.')
    }
})
