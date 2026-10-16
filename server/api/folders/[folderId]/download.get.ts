import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { storagePath } from '~~/server/utils/files'
import { createTar, type ArchiveEntry } from '~~/server/utils/tar'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    const id = getRouterParam(event, 'folderId')
    if (!id || !isUuid(id)) throwError(400, 'Invalid folder ID.')
    enforceRateLimit(event, `folders-download:${session.userId}`, 10, 60000)
    try {
        const root = await prisma.folders.findFirst({ where: { id, user_id: session.userId } })
        if (!root) throwError(404, 'Folder not found.')
        const safe = (name: string) => {
            const value = name.replace(/[/\\\0:]/g, '_')
            return !value || value === '.' || value === '..' ? '_' : value
        }
        const used = new Set<string>()
        const unique = (path: string, itemId: string) => {
            let name = path
            while (used.has(name)) name = `${name}-${itemId}`
            used.add(name)
            return name
        }
        const paths = new Map([[root.id, unique(safe(root.name), root.id)]])
        let pending = [root.id]
        while (pending.length) {
            const children = await prisma.folders.findMany({ where: {
                user_id: session.userId, parent_folder_id: { in: pending }
            } })
            pending = []
            for (const folder of children) {
                if (paths.has(folder.id)) continue
                paths.set(folder.id, unique(`${paths.get(folder.parent_folder_id!)}/${safe(folder.name)}`, folder.id))
                pending.push(folder.id)
            }
        }
        const where = { user_id: session.userId, folder_id: { in: [...paths.keys()] } }
        const [files, notes] = await Promise.all([
            prisma.files.findMany({ where }), prisma.notes.findMany({ where })
        ])
        const entries: ArchiveEntry[] = [...paths.values()].map(path => ({
            path, size: 0, content: Readable.from([]), directory: true
        }))
        for (const file of files) {
            const path = storagePath(file.storage_key)
            const info = await stat(path)
            if (!info.isFile()) throwError(404, 'A stored file is missing.')
            entries.push({ path: unique(`${paths.get(file.folder_id!)}/${safe(file.original_name)}`, file.id),
                size: info.size, content: (async function* () {
                    yield* createReadStream(path)
                })() })
        }
        for (const note of notes) {
            const content = Buffer.from(note.content, 'utf8')
            entries.push({ path: unique(`${paths.get(note.folder_id!)}/${safe(note.title)}.txt`, note.id),
                size: content.length, content: Readable.from([content]) })
        }
        setHeader(event, 'Cache-Control', 'no-store')
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Type', 'application/x-tar')
        setHeader(event, 'Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safe(root.name))}.tar`)
        return await sendStream(event, createTar(entries))
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throwError(404, 'A stored file is missing.')
        console.error('Folder download failed:', error)
        throwError(500, 'Could not download folder.')
    }
})
