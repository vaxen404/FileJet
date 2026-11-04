import { requireAdmin } from '../../../utils/admin'
import { adminHistory } from '../../../utils/adminHistory'
export default defineEventHandler(async event => {
    const actor = await requireAdmin(event)
    enforceRateLimit(event,`admin-history:${actor.id}`,120,60000)
    setHeader(event,'Cache-Control','private, no-store')
    return adminHistory(getQuery(event))
})
