import { stat, readFile } from 'node:fs/promises'
import { zipSync, strToU8 } from 'fflate'
import { prisma } from './prisma'
import { throwError } from './error'
import { storagePath } from './files'

export async function createFolderArchive(userId: string, folderId: string) {
    const root = await prisma.folders.findFirst({
        where: {
            id: folderId,
            user_id: userId
        }
    })

    if (!root) {
        throwError(404, 'Folder not found.')
    }

    const safe = (name: string) => {
        const value = name.replace(/[/\\\0:]/g, '_').trim()

        return !value || value === '.' || value === '..' ? '_' : value
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

    const paths = new Map<string, string>([[root.id, unique(safe(root.name), root.id)]])

    let pending = [root.id]

    while (pending.length) {
        const children = await prisma.folders.findMany({
            where: {
                user_id: userId,
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

            paths.set(folder.id, unique(`${parentPath}/${safe(folder.name)}`, folder.id))

            pending.push(folder.id)
        }
    }

    const where = {
        user_id: userId,
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

        const entryName = unique(`${folderPath}/${safe(file.original_name)}`, file.id)

        zipEntries[entryName] = new Uint8Array(content)
    }

    // Notları .txt olarak ekle.
    for (const note of notes) {
        const folderPath = paths.get(note.folder_id!)

        if (!folderPath) {
            throwError(409, 'Invalid note folder.')
        }

        const entryName = unique(`${folderPath}/${safe(note.title)}.txt`, note.id)

        zipEntries[entryName] = strToU8(note.content)
    }

    const zip = zipSync(zipEntries, {
        level: 6
    })

    return { data: Buffer.from(zip), name: safe(root.name) + '.zip' }
}
