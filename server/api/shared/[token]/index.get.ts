import { prisma } from "~~/server/utils/prisma";
import { throwError } from "~~/server/utils/error";

export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')

        if (!token) {
            throwError(400, 'Share token is required.')
        }

        const sharedItem = await prisma.shared_items.findUnique({
            where: {
                token
            },
            include: {
                users: {
                    select: {
                        username: true
                    }
                }
            }
        })

        if (!sharedItem) {
            throwError(404, 'Shared item not found.')
        }

        if (sharedItem.item_type === 'file') {
            const file = await prisma.files.findUnique({
                where: {
                    id: sharedItem.item_id
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
                sharedBy: sharedItem.users.username,
                item: {
                    ...file,
                    size: Number(file.size)
                }
            }
        }

        if (sharedItem.item_type === 'folder') {
            const folder = await prisma.folders.findUnique({
                where: {
                    id: sharedItem.item_id
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
                sharedBy: sharedItem.users.username,
                item: folder
            }
        }

        if (sharedItem.item_type === 'note') {
            const note = await prisma.notes.findUnique({
                where: {
                    id: sharedItem.item_id
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
                sharedBy: sharedItem.users.username,
                item: {
                    ...note,
                    size: Number(note.size)
                }
            }
        }

        throwError(400, 'Invalid shared item type.')
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the share item.')
    }
})