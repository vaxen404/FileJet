
import { stat, readFile } from 'node:fs/promises'
import { zipSync, strToU8 } from 'fflate'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { storagePath } from '~~/server/utils/files'

export default defineEventHandler(async (event) => {
    const session = getAuthSession(event)

    if (!session) {
        throwError(401, 'You need to be logged in.')
    }

    const folderId = getRouterParam(event, 'folderId')

    if (!folderId || !isUuid(folderId)) {
        throwError(400, 'Invalid folder ID.')
    }

    enforceRateLimit(event, `folders-download:${session.userId}`, 10, 60000)

    try {
        const root = await prisma.folders.findFirst({
            where: {
                id: folderId,
                user_id: session.userId
            }
        })

        if (!root) {
            throwError(404, 'Folder not found.')
        }

        const safe = (name: string) => {
            const value = name.replace(/[/\\\0:]/g, '_').trim()

            return !value || value === '.' || value === '..'
                ? '_'
                : value
        }

        const used = new Set<string>()

        const unique = (filePath: string, itemId: string) => {
            let name = filePath

            while (used.has(name)) {
                name = `${filePath}-${itemId}`
            }

            used.add(name)
            return name
        }

        const paths = new Map<string, string>([
            [root.id, unique(safe(root.name), root.id)]
        ])

        let pending = [root.id]

        while (pending.length) {
            const children = await prisma.folders.findMany({
                where: {
                    user_id: session.userId,
                    parent_folder_id: {
                        in: pending
                    }
                }
            })

            pending = []

            for (const folder of children) {
                if (paths.has(folder.id)) continue

                const parentPath = paths.get(folder.parent_folder_id!)

                if (!parentPath) continue

                paths.set(
                    folder.id,
                    unique(
                        `${parentPath}/${safe(folder.name)}`,
                        folder.id
                    )
                )

                pending.push(folder.id)
            }
        }

        const where = {
            user_id: session.userId,
            folder_id: {
                in: [...paths.keys()]
            }
        }

        const [files, notes] = await Promise.all([
            prisma.files.findMany({ where }),
            prisma.notes.findMany({ where })
        ])

        const zipEntries: Record<string, Uint8Array> = {}

        // Boş klasörleri de ZIP'e ekle.
        for (const folderPath of paths.values()) {
            zipEntries[`${folderPath}/`] = new Uint8Array(0)
        }

        // Dosyaları ekle.
        for (const file of files) {
            const folderPath = paths.get(file.folder_id!)

            if (!folderPath) {
                throwError(409, 'Invalid file folder.')
            }

            const filePath = storagePath(file.storage_key)
            const info = await stat(filePath)

            if (!info.isFile()) {
                throwError(404, 'A stored file is missing.')
            }

            const content = await readFile(filePath)

            const entryName = unique(
                `${folderPath}/${safe(file.original_name)}`,
                file.id
            )

            zipEntries[entryName] = new Uint8Array(content)
        }

        // Notları .txt olarak ekle.
        for (const note of notes) {
            const folderPath = paths.get(note.folder_id!)

            if (!folderPath) {
                throwError(409, 'Invalid note folder.')
            }

            const entryName = unique(
                `${folderPath}/${safe(note.title)}.txt`,
                note.id
            )

            zipEntries[entryName] = strToU8(note.content)
        }

        const zip = zipSync(zipEntries, {
            level: 6
        })

        setHeader(event, 'Cache-Control', 'no-store')
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Type', 'application/zip')

        setHeader(
            event,
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(
                safe(root.name) + '.zip'
            )}`
        )

        return Buffer.from(zip)

    } catch (error: any) {
        if (error.statusCode) throw error

        if (
            error.code === 'ENOENT' ||
            error.code === 'ENOTDIR'
        ) {
            throwError(404, 'A stored file is missing.')
        }

        console.error('Folder download failed:', error)

        throwError(500, 'Could not download folder.')
    }
})
