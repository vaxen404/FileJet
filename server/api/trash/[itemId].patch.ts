import { prisma } from "~~/server/utils/prisma";
import { getAuthSession } from "~~/server/utils/auth";
import { throwError } from "~~/server/utils/error";
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async ( event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `trash-undo:${session.userId}`, 10, 60 * 1000)

        const itemId = getRouterParam(event, 'itemId')

        if (!itemId || !isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }

        await prisma.$transaction(
            async ( tx) => {
                const item = await tx.trash.findFirst({
                    where: {
                        id: itemId,
                        user_id: session.userId
                    }
                })

                if (!item) {
                    throwError(404, 'Item not found.')
                }

                const itemType = item.item_type

                if (!['file', 'note', 'folder'].includes(itemType)) {
                    throwError(400, 'Unsupported item type.')
                }

                if (itemType === 'file') {
                    if (
                        !item.name ||
                        !item.original_name ||
                        !item.storage_key ||
                        item.size === null
                    ) {
                        throwError(409, 'File data is incomplete.')
                    }

                    if (item.root_folder_id) {
                        throwError(409, 'Restore the parent folder first.')
                    }

                    const existingFile = await tx.files.findFirst({
                        where: {
                            id: item.item_id,
                            user_id: session.userId
                        }
                    })

                    if (existingFile) {
                        throwError(409, 'File already exists.')
                    }

                    if (item.folder_id) {
                        const folder = await tx.folders.findFirst({
                            where: {
                                id: item.folder_id,
                                user_id: session.userId
                            }
                        })

                        if (!folder) {
                            throwError(409, 'Original folder no longer exists.')
                        }
                    }

                    await tx.files.create({
                        data: {
                            id: item.item_id,
                            user_id: session.userId,
                            folder_id: item.folder_id,
                            name: item.name,
                            original_name: item.original_name,
                            mime_type: item.mime_type,
                            size: item.size,
                            storage_key: item.storage_key
                        }
                    })
                }

                if (itemType === 'note') {
                    if (!item.name || item.content === null || item.size === null) {
                        throwError(409, 'Note data is incomplete.')
                    }

                    if (item.root_folder_id) {
                        throwError(409, 'Restore the parent folder first.')
                    }

                    const existingNote = await tx.notes.findFirst({
                        where: {
                            id: item.item_id,
                            user_id: session.userId
                        }
                    })

                    if (existingNote) {
                        throwError(409, 'Note already exists.')
                    }

                    if (item.folder_id) {
                        const folder = await tx.folders.findFirst({
                            where: {
                                id: item.folder_id,
                                user_id: session.userId
                            }
                        })

                        if (!folder) {
                            throwError(409, 'Original folder no longer exists.')
                        }
                    }

                    await tx.notes.create({
                        data: {
                            id: item.item_id,
                            user_id: session.userId,
                            folder_id: item.folder_id,
                            title: item.name,
                            content: item.content,
                            size: item.size
                        }
                    })
                }

                if (itemType === 'folder') {
                    if (!item.name) {
                        throwError(409, 'Folder data is incomplete.')
                    }

                    if (item.root_folder_id !== item.item_id) {
                        throwError(409, 'Restore the parent folder first.')
                    }

                    const trashItems = await tx.trash.findMany({
                        where: {
                            user_id: session.userId,
                            root_folder_id: item.item_id
                        }
                    })

                    const folders = trashItems.filter(item => item.item_type === 'folder')

                    if (!folders.some(folder => folder.item_id === item.item_id)) {
                        throwError(409, 'Root folder is missing from trash.')
                    }

                    const folderIds = new Set(folders.map(folder => folder.item_id))

                    for (const folder of folders) {
                        if (
                            folder.item_id !== item.item_id &&
                            (!folder.parent_folder_id || !folderIds.has(folder.parent_folder_id))
                        ) {
                            throwError(409, 'Invalid folder hierarchy.')
                        }
                    }

                    const restoredIds = new Set<string>()

                    while (restoredIds.size < folders.length) {
                        let restored = 0

                        for (const folder of folders) {
                            if (restoredIds.has(folder.item_id)) continue

                            if (!folder.name) {
                                throwError(409, 'Folder data is incomplete.')
                            }

                            const parentId = folder.parent_folder_id

                            if (parentId && !restoredIds.has(parentId)) {
                                const existingParent = await tx.folders.findFirst({
                                    where: {
                                        id: parentId,
                                        user_id: session.userId
                                    }
                                })

                                if (!existingParent) {
                                    continue
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

                            restoredIds.add(folder.item_id)
                            restored++
                        }

                        if (restored === 0) {
                            throwError(409, 'Invalid folder hierarchy.')
                        }
                    }

                    const files = trashItems.filter(item => item.item_type === 'file')

                    for (const file of files) {
                        if (
                            !file.name ||
                            !file.original_name ||
                            !file.storage_key ||
                            file.size === null
                        ) {
                            throwError(409, 'File data is incomplete.')
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

                    const notes = trashItems.filter(item => item.item_type === 'note')

                    for (const note of notes) {
                        if (!note.name || note.content === null || note.size === null) {
                            throwError(409, 'Note data is incomplete.')
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

                    await tx.trash.deleteMany({
                        where: {
                            user_id: session.userId,
                            root_folder_id: item.item_id
                        }
                    })
                }

                if (itemType !== 'folder') {
                    await tx.trash.delete({
                        where: {
                            id: item.id,
                            user_id: session.userId
                        }
                    })
                }
            },
            { maxWait: 5000, timeout: 50000 }
        )

        return {
            success: true
        }
    } catch (err: any) {
        if (err.code === 'P2002') {
            throwError(409, 'Item already exists.')
        }

        if (err.statusCode) throw err

        throwError(500, 'An unexpected error occurred while restoring the item.')
    }
})
