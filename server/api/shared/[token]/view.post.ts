import { getSharedTarget } from '~~/server/utils/sharedTarget'
import { recordShareActivity } from '~~/server/utils/shareStatistics'
import { assertShareOrigin } from '~~/server/utils/shares'
export default defineEventHandler(async event => {
    assertShareOrigin(event)
    const target = await getSharedTarget(event)
    enforceRateLimit(event, `shared-view:${target.share.token}`, 120, 60000)
    await recordShareActivity(event, target.share, 'view')
    return { success: true }
})
