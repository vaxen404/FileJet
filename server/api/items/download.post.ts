import { readFile } from 'node:fs/promises'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { storagePath } from '~~/server/utils/files'
import { createFolderArchive } from '~~/server/utils/folderArchive'
import { itemSelectionSchema } from '~~/shared/schemas/selection'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    enforceRateLimit(event, `items-download:${session.userId}`, 10, 60_000)
    const parsed = itemSelectionSchema.safeParse(await readBody(event))
    if (!parsed.success) throwError(400, 'Choose between 1 and 200 items to download.')
    try {
        const ids = (type: 'file' | 'folder' | 'note') => parsed.data.items.filter(item => item.type === type).map(item => item.id)
        const [files, folders, notes] = await Promise.all([
            prisma.files.findMany({ where: { user_id: session.userId, id: { in: ids('file') } } }),
            prisma.folders.findMany({ where: { user_id: session.userId, id: { in: ids('folder') } } }),
            prisma.notes.findMany({ where: { user_id: session.userId, id: { in: ids('note') } } })
        ])
        if (files.length + folders.length + notes.length !== parsed.data.items.length) throwError(404, 'One or more selected items could not be found.')
        const entries: Record<string, Uint8Array> = Object.create(null)
        const used = new Set<string>()
        const safe = (name: string) => {
            const value = name.replace(/[/\\\0:]/g, '_').trim()
            return !value || value === '.' || value === '..' ? 'Untitled' : value
        }
        const unique = (name: string) => {
            let value = name
            let index = 2
            const dot = name.lastIndexOf('.')
            const base = dot > 0 ? name.slice(0, dot) : name
            const extension = dot > 0 ? name.slice(dot) : ''
            while (used.has(value.toLowerCase())) value = `${base} (${index++})${extension}`
            used.add(value.toLowerCase())
            return value
        }
        for (const file of files) entries[unique(safe(file.original_name))] = new Uint8Array(await readFile(storagePath(file.storage_key)))
        for (const note of notes) entries[unique(safe(note.title) + '.txt')] = strToU8(note.content)
        for (const folder of folders) {
            const archive = await createFolderArchive(session.userId, folder.id)
            const prefix = unique(safe(folder.name))
            for (const [path, content] of Object.entries(unzipSync(archive.data))) {
                const relative = path.split('/').slice(1).join('/')
                entries[`${prefix}/${relative}`] = content
            }
        }
        setResponseHeaders(event, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="FileJet-selection.zip"',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        })
        return Buffer.from(zipSync(entries, { level: 6 }))
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throwError(404, 'A stored file is missing.')
        console.error('[SELECTION DOWNLOAD ERROR]', error)
        throwError(500, 'Could not download the selected items.')
    }
})
