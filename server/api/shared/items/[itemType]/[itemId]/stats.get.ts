import { prisma } from '~~/server/utils/prisma'
import { inboxOwner, inboxParam } from '~~/server/utils/inbox'
import { requireOwnedShareItem } from '~~/server/utils/shares'
import type { ShareStatistics } from '~~/shared/types/shareStatistics'
export default defineEventHandler(async (event): Promise<ShareStatistics> => {
    const userId = inboxOwner(event), itemId = inboxParam(event, 'itemId'), itemType = getRouterParam(event, 'itemType')
    await requireOwnedShareItem(userId, itemId, itemType)
    const share = await prisma.shared_items.findFirst({ where: { user_id: userId, item_id: itemId, item_type: itemType } })
    if (!share) return { views: '0', downloads: '0', lastViewedAt: null, lastDownloadedAt: null, daily: [] }
    const since = new Date(); since.setUTCHours(0,0,0,0); since.setUTCDate(since.getUTCDate()-29)
    const [total, days] = await prisma.$transaction([
        prisma.share_daily_stats.aggregate({ where: { share_id: share.id }, _sum: { views: true, downloads: true }, _max: { last_viewed_at: true, last_downloaded_at: true } }),
        prisma.share_daily_stats.findMany({ where: { share_id: share.id, day: { gte: since } }, orderBy: { day: 'desc' } })
    ], { isolationLevel: 'RepeatableRead' })
    return { views: (total._sum.views ?? 0n).toString(), downloads: (total._sum.downloads ?? 0n).toString(), lastViewedAt: total._max.last_viewed_at?.toISOString() ?? null, lastDownloadedAt: total._max.last_downloaded_at?.toISOString() ?? null, daily: days.map(row => ({ day: row.day.toISOString().slice(0,10), views: row.views.toString(), downloads: row.downloads.toString() })) }
})
