import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, "You need to be logged in.")
        }

        enforceRateLimit(event, `trash-bulk-restore:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (
            !body ||
            !Array.isArray(body.itemIds) ||
            body.itemIds.length === 0 ||
            body.itemIds.length > 50 ||
            !body.itemIds.every((id: unknown) =>
                typeof id === "string" && isUuid(id)
            )
        ) {
            throwError(400, "Invalid item IDs.")
        }

        const itemIds = [...new Set<string>(body.itemIds)]

        const restoredCount = await prisma.$transaction(async (tx) => {
            const items = await tx.trash.findMany({
                where: {
                    id: { in: itemIds },
                    user_id: session.userId
                }
            })

            if (items.length !== itemIds.length) {
                throwError(404, 'Some items were not found.')
            }

            const selectedFolderIds  = new Set(
                items.filter(item => item.item_type === 'folder')
                .map(item => item.item_id)
            )

            const trashGroupIds = new Set(
                items.filter(item => item.item_type === 'folder')
                .map(item => item.root_folder_id)
                .filter((id): id is string => id !== null)
            )

            const trashItems = await tx.trash.findMany({
                where: {
                    user_id: session.userId,
                    root_folder_id: { in: [...trashGroupIds] }
                }
            })

            let changed = true

            while (changed) {
                changed = false

                for (const folder of trashItems) {
                    if (folder.item_type === 'folder' &&
                        folder.parent_folder_id &&
                        selectedFolderIds .has(folder.parent_folder_id) &&
                        !selectedFolderIds .has(folder.item_id)
                    ) {
                        selectedFolderIds .add(folder.item_id)
                        changed = true
                    }
                }
            }

            const restoreItems = new Map(
                items.map(item => [item.id, item])
            )

            for (const item of trashItems) {
                if (
                    (item.item_type === 'folder' && selectedFolderIds .has(item.item_id)) ||
                    (
                        ['file', 'note'].includes(item.item_type) &&
                        item.folder_id !== null &&
                        selectedFolderIds .has(item.folder_id)
                    )
                ) {
                    restoreItems.set(item.id, item)
                }
            }

            const selectedItems = [...restoreItems.values()]

            
            const folders = selectedItems.filter(
                item => item.item_type === 'folder'
            )
            
            const foldersToRestoreIds = new Set(
                folders.map(folder => folder.item_id)
            )
            
            for (const item of selectedItems) {
                if (
                    ['file', 'note'].includes(item.item_type) &&
                    item.root_folder_id &&
                    (!item.folder_id || !foldersToRestoreIds.has(item.folder_id))
                ) {
                    throwError(409, 'Restore the parent folder first.')
                }
            }

            const restoredFolderIds = new Set<string>()

            while (restoredFolderIds.size < folders.length) {
                let restored = 0

                for (const folder of folders) {
                    if (restoredFolderIds.has(folder.item_id)) continue

                    if (!folder.name) {
                        throwError(409, 'Folder data is incomplete.')
                    }

                    const parentId = folder.parent_folder_id

                    if (parentId && !restoredFolderIds.has(parentId)) {
                        if (foldersToRestoreIds.has(parentId)) continue

                        const existingParent = await tx.folders.findFirst({
                            where: {
                                id: parentId,
                                user_id: session.userId
                            }
                        })

                        if (!existingParent) {
                            throwError(409, 'Original parent folder no longer exists.')
                        }
                    }

                    await tx.folders.create({
                        data: {
                            id: folder.item_id,
                            user_id: session.userId,
                            name: folder.name,
                            parent_folder_id: parentId
                        }
                    })

                    restoredFolderIds.add(folder.item_id)
                    restored++
                }

                if (restored === 0) {
                    throwError(409, 'Invalid folder hierarchy.')
                }
            }

            const files = selectedItems.filter(
                item => item.item_type === 'file'
            )

            for (const file of files) {
                if (!file.name || !file.original_name || !file.storage_key || file.size === null) {
                    throwError(409, 'File data is incomplete.')
                }

                if (file.folder_id) {
                    const folder = await tx.folders.findFirst({
                        where: {
                            id: file.folder_id,
                            user_id: session.userId
                        }
                    })

                    if (!folder) {
                        throwError(409, 'Original folder no longer exists.')
                    }
                }

                await tx.files.create({
                    data: {
                        id: file.item_id,
                        user_id: session.userId,
                        folder_id: file.folder_id,
                        name: file.name,
                        original_name: file.original_name,
                        mime_type: file.mime_type,
                        size: file.size,
                        storage_key: file.storage_key
                    }
                })
            }

            const notes = selectedItems.filter(
                item => item.item_type === 'note'
            )

            for (const note of notes) {
                if (!note.name || note.content === null || note.size === null) {
                    throwError(409, 'Note data is incomplete.')
                }

                if (note.folder_id) {
                    const folder = await tx.folders.findFirst({
                        where: {
                            id: note.folder_id,
                            user_id: session.userId
                        }
                    })

                    if (!folder) {
                        throwError(409, 'Original folder no longer exists.')
                    }
                }

                await tx.notes.create({
                    data: {
                        id: note.item_id,
                        user_id: session.userId,
                        folder_id: note.folder_id,
                        title: note.name,
                        content: note.content,
                        size: note.size
                    }
                })
            }

            const deleted = await tx.trash.deleteMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: selectedItems.map(item => item.id)
                    }
                }
            })

            if (deleted.count !== selectedItems.length) {
                throwError(409, 'Trash contents have changed.')
            } 

            return selectedItems.length
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 50000 })

        return {
            success: true,
            restoredCount
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, "An unexpected error occurred while restoring items.")
    }
})