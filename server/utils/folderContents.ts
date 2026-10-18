import { createError } from 'h3'
import { prisma } from './prisma'
import { isUuid } from './validation'
import type { LibraryItem } from '../../shared/types/library'

export async function requireFolderWithin(userId: string, rootId: string, folderId: string) {
    if (!isUuid(folderId)) throw createError({ statusCode: 400, message: 'Invalid folder ID.' })

    const visited = new Set<string>()
    let current: string | null = folderId

    while (current && !visited.has(current)) {
        visited.add(current)
        const folder: { id: string; parent_folder_id: string | null } | null =
            await prisma.folders.findFirst({
                where: { id: current, user_id: userId },
                select: { id: true, parent_folder_id: true }
            })

        if (!folder) break
        if (folder.id === rootId) return
        current = folder.parent_folder_id
    }

    throw createError({ statusCode: 404, message: 'Item not found in this shared folder.' })
}

export async function getFolderTree(userId: string, rootId: string) {
    const ids = new Set([rootId])
    let pending = [rootId]

    while (pending.length) {
        const children = await prisma.folders.findMany({
            where: { user_id: userId, parent_folder_id: { in: pending } },
            select: { id: true }
        })

        pending = []

        for (const child of children) {
            if (ids.has(child.id)) continue
            ids.add(child.id)
            pending.push(child.id)
        }
    }

    return [...ids]
}

export async function getFolderContents(userId: string, folderId: string) {
    const [folders, files, notes] = await Promise.all([
        prisma.folders.findMany({
            where: { user_id: userId, parent_folder_id: folderId },
            select: { id: true, name: true, created_at: true, updated_at: true }
        }),
        prisma.files.findMany({
            where: { user_id: userId, folder_id: folderId },
            select: {
                id: true,
                name: true,
                original_name: true,
                mime_type: true,
                size: true,
                created_at: true,
                updated_at: true
            }
        }),
        prisma.notes.findMany({
            where: { user_id: userId, folder_id: folderId },
            select: { id: true, title: true, size: true, created_at: true, updated_at: true }
        })
    ])

    const items: LibraryItem[] = [
        ...folders.map(item => ({ ...item, type: 'folder' as const, size: '0' })),
        ...files.map(item => ({ ...item, type: 'file' as const, size: item.size.toString() })),
        ...notes.map(item => ({
            ...item,
            type: 'note' as const,
            name: item.title,
            size: item.size.toString()
        }))
    ].map(item => ({
        ...item,
        created_at: item.created_at?.toISOString() ?? null,
        updated_at: item.updated_at?.toISOString() ?? null
    }))

    return { items, counts: { files: files.length, folders: folders.length, notes: notes.length } }
}
