import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { lockStorageUser } from '~~/server/utils/storage'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    enforceRateLimit(event, `folders-rename:${session.userId}`, 10, 60000)
    const id = getRouterParam(event, 'folderId')
    if (!id || !isUuid(id)) throwError(400, 'Invalid folder ID.')
    const body = await readBody(event)
    const name = typeof body?.newName === 'string' ? body.newName.trim() : ''
    if (!name || name === '.' || name === '..' || /[/\\\0]/.test(name) || Buffer.byteLength(name) > 255) {
        throwError(400, 'Invalid folder name.')
    }
    try {
        const folder = await prisma.$transaction(async tx => {
            await lockStorageUser(tx, session.userId)
            const existing = await tx.folders.findFirst({ where: { id, user_id: session.userId } })
            if (!existing) throwError(404, 'Folder not found.')
            if (await tx.folders.findFirst({ where: {
                user_id: session.userId, parent_folder_id: existing.parent_folder_id,
                name, id: { not: id }
            } })) throwError(409, 'A folder with this name already exists.')
            return tx.folders.update({ where: { id, user_id: session.userId }, data: { name, updated_at: new Date() } })
        })
        return { success: true, folder }
    } catch (error: any) {
        if (error.statusCode) throw error
        if (error.code === 'P2002') throwError(409, 'A folder with this name already exists.')
        console.error('Folder rename failed:', error)
        throwError(500, 'Could not rename folder.')
    }
})
