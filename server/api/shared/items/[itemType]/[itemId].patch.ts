import { throwError } from '~~/server/utils/error'
import { readShareBody } from '../../../../utils/shareBody'
import { prisma } from '../../../../utils/prisma'
import { getAuthSession } from '../../../../utils/auth'
import { enforceRateLimit } from '../../../../utils/rateLimit'
import { requireOwnedShareItem, assertShareOrigin, shareState } from '../../../../utils/shares'
import { parseShareSettings } from '../../../../utils/shareSettings'

export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    enforceRateLimit(event, `share-settings:${session.userId}`, 10, 60 * 1000)

    const { itemId, itemType } = await requireOwnedShareItem(
        session.userId,
        getRouterParam(event, 'itemId'),
        getRouterParam(event, 'itemType')
    )

    const existing = await prisma.shared_items.findFirst({
        where: { user_id: session.userId, item_id: itemId, item_type: itemType }
    })

    if (!existing) throwError(404, 'Share link not found.')

    const data = await parseShareSettings(await readShareBody(event), existing.expires_at)

    const updated = await prisma.shared_items.updateMany({
        where: { id: existing.id, user_id: session.userId },
        data
    })

    if (!updated.count) throwError(404, 'Share link not found.')

    const result = await prisma.shared_items.findFirst({
        where: { id: existing.id, user_id: session.userId }
    })

    return shareState(event, result)
})
