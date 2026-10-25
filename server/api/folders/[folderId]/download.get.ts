import { throwError } from '~~/server/utils/error'
import { getAuthSession } from '../../../utils/auth'
import { isUuid } from '../../../utils/validation'
import { createFolderArchive } from '../../../utils/folderArchive'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    const folderId = getRouterParam(event, 'folderId')

    if (!folderId || !isUuid(folderId))
        throwError(400, 'Invalid folder ID.')

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
            throwError(404, 'A stored file is missing.')
        }

        throwError(500, 'Could not download folder.')
    }
})
