import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import type { MultiPartData } from 'h3'

export type FilePart = MultiPartData & {
    name: 'files'
    filename: string
}

export function isFilePart(part: MultiPartData): part is FilePart {
    return part.name === 'files'
        && typeof part.filename === 'string'
        && part.filename.length > 0
        && Buffer.isBuffer(part.data)
}

export const getFileParts = (formData: MultiPartData[]): FilePart[] => {
    return formData.filter(isFilePart)
}

export const getTotalUploadSize = (files: FilePart[]): number => {
    return files.reduce((total, file) => {
        return total + file.data.length
    }, 0)
}

export const saveFileToStorage = async (
    userId: string,
    file: FilePart
): Promise<{ safeName: string; storageKey: string }> => {
    const fileId = randomUUID()

    const safeName = file.filename
        .replace(/[/\\]/g, '_')
        .replace(/\0/g, '')

    const storedName = `${fileId}-${safeName}`

    const uploadDir = join(
        process.cwd(),
        'storage',
        userId
    )

    await mkdir(uploadDir, {
        recursive: true
    })

    await writeFile(
        join(uploadDir, storedName),
        file.data
    )

    return {
        safeName,
        storageKey: `${userId}/${storedName}`
    }
}
