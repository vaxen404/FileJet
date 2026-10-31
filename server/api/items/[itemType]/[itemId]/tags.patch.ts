import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { lockStorageUser } from '~~/server/utils/storage'
import { assertShareOrigin } from '~~/server/utils/shares'
import { readShareBody } from '~~/server/utils/shareBody'
import { throwError } from '~~/server/utils/error'
import { parseTags } from '~~/shared/utils/tags'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const userId = inboxOwner(event), id = inboxParam(event, 'itemId'), type = getRouterParam(event, 'itemType')
    if (!['file', 'folder', 'note'].includes(type ?? '')) throwError(400, 'Invalid item type.')
    enforceRateLimit(event, `tags:${userId}`, 60, 60000)
    let tags: string[]
    try { tags = parseTags((await readShareBody(event)).tags) } catch (error) { throwError(400, (error as Error).message) }
    await prisma.$transaction(async tx => {
        await lockStorageUser(tx, userId)
        const where = { id, user_id: userId }, data = { tags }
        const result = type === 'file' ? await tx.files.updateMany({ where, data }) : type === 'folder' ? await tx.folders.updateMany({ where, data }) : await tx.notes.updateMany({ where, data })
        if (result.count !== 1) throwError(404, 'Item not found.')
    })
    return { tags }
})
