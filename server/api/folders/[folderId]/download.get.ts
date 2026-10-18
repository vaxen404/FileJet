import { getAuthSession } from '../../../utils/auth'
import { isUuid } from '../../../utils/validation'
import { createFolderArchive } from '../../../utils/folderArchive'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throw createError({ statusCode: 401, message: 'You need to be logged in.' })

    const folderId = getRouterParam(event, 'folderId')
    if (!folderId || !isUuid(folderId))
        throw createError({ statusCode: 400, message: 'Invalid folder ID.' })
    enforceRateLimit(event, 'folders-download:' + session.userId, 10, 60000)

    try {
        const archive = await createFolderArchive(session.userId, folderId)
        setResponseHeaders(event, {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Type': 'application/zip',
            'Content-Disposition':
                "attachment; filename*=UTF-8''" + encodeURIComponent(archive.name)
        })
        return archive.data
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            throw createError({ statusCode: 404, message: 'A stored file is missing.' })
        }
        throw createError({ statusCode: 500, message: 'Could not download folder.' })
    }
})
