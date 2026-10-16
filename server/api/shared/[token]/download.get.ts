
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, 'token')

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid share token'
        })
    }

    const sharedItem = await prisma.shared_items.findUnique({
        where: {
            token
        }
    })

    if (!sharedItem || sharedItem.item_type !== 'file') {
        throw createError({
            statusCode: 404,
            statusMessage: 'Shared file not found'
        })
    }

    const file = await prisma.files.findFirst({
        where: {
            id: sharedItem.item_id,
                    user_id: sharedItem.user_id
        }
    })

    if (!file) {
        throw createError({
            statusCode: 404,
            statusMessage: 'File not found'
        })
    }

    const storageDirectory = resolve(process.cwd(), 'storage')
    const filePath = resolve(storageDirectory, file.storage_key)

    if (!filePath.startsWith(storageDirectory + sep)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Invalid file path'
        })
    }

    let fileStat

    try {
        fileStat = await stat(filePath)
    } catch (error: any) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
        throw createError({
            statusCode: 404,
            statusMessage: 'File not found on disk'
        })
    }

    if (!fileStat.isFile()) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Invalid file'
        })
    }

    const fileName = file.name || file.original_name || 'download'
    const encodedName = encodeURIComponent(fileName)

    setResponseHeaders(event, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    })

    return sendStream(event, createReadStream(filePath))
})
