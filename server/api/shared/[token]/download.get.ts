import { getSharedTarget } from '../../../utils/sharedTarget'
import { createFolderArchive } from '../../../utils/folderArchive'
import { enforceRateLimit } from '../../../utils/rateLimit'

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
    const target = await getSharedTarget(event)
    const sharedItem = target.share
    enforceRateLimit(event, `shared-download:${sharedItem.token}`, 60, 60 * 1000)

    if (target.type === 'folder') {
        const archive = await createFolderArchive(sharedItem.user_id, target.id)
        setResponseHeaders(event, {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(archive.name)}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        })

        return archive.data
    }

    if (target.type === 'note' && 'content' in target.item && 'title' in target.item) {
        setResponseHeaders(event, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(target.item.title.replace(/[/\\\0]/g, '_') + '.txt')}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        })

        return target.item.content
    }

    if (target.type !== 'file') {
        throw createError({
            statusCode: 404,
            statusMessage: 'Shared file not found'
        })
    }

    const file = await prisma.files.findFirst({
        where: {
            id: target.id,
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

    const fileName = file.original_name || file.name || 'download'
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
