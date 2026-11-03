import { safeStoragePath } from '~~/server/utils/fileSecurity'
import { recordShareActivity } from '~~/server/utils/shareStatistics'
import { claimShareDownload } from '~~/server/utils/shareLimits'
import { throwError } from '~~/server/utils/error'
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
        if (getMethod(event) === 'HEAD') {
            setHeader(event, 'Content-Type', 'application/zip')
            return ''
        }
        const archive = await createFolderArchive(sharedItem.user_id, target.id)
        await claimShareDownload(event, sharedItem)
        setResponseHeaders(event, {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(archive.name)}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        })

        await recordShareActivity(event, sharedItem, 'download', target.id)
        return archive.data
    }

    if (target.type === 'note' && 'content' in target.item && 'title' in target.item) {
        await claimShareDownload(event, sharedItem)
        setResponseHeaders(event, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(target.item.title.replace(/[/\\\0]/g, '_') + '.txt')}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        })

        await recordShareActivity(event, sharedItem, 'download', target.id)
        return target.item.content
    }

    if (target.type !== 'file') {
        throwError(404, 'Shared file not found', {
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
        throwError(404, 'File not found', {
            statusMessage: 'File not found'
        })
    }

    const storageDirectory = resolve(process.cwd(), 'storage')
    const filePath = await safeStoragePath(sharedItem.user_id, file.storage_key)

    if (!filePath.startsWith(storageDirectory + sep)) {
        throwError(403, 'Invalid file path', {
            statusMessage: 'Invalid file path'
        })
    }

    let fileStat

    try {
        fileStat = await stat(filePath)
    } catch (error: any) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error

        throwError(404, 'File not found on disk', {
            statusMessage: 'File not found on disk'
        })
    }

    if (!fileStat.isFile()) {
        throwError(404, 'Invalid file', {
            statusMessage: 'Invalid file'
        })
    }

    const fileName = file.original_name || file.name || 'download'
    const encodedName = encodeURIComponent(fileName)

    await claimShareDownload(event, sharedItem)

    setResponseHeaders(event, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(fileStat.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    })

    await recordShareActivity(event, sharedItem, 'download', target.id)
    if (getMethod(event) === 'HEAD') return ''
    return sendStream(event, createReadStream(filePath))
})
