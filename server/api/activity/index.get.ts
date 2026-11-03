import type { Prisma } from '~~/src/generated/prisma/client'
import { prisma } from '../../utils/prisma'
import { inboxOwner } from '../../utils/inbox'
import { throwError } from '../../utils/error'
import { isUuid } from '../../utils/validation'
import { activityActions, type ActivityAction, type ActivityKind, type ActivityPage } from '../../../shared/types/activity'
export default defineEventHandler(async event => {
    const owner = inboxOwner(event), query = getQuery(event)
    const where: Prisma.activity_entriesWhereInput = { user_id: owner }
    if (query.type) { if (!['file','folder','note','inbox','batch'].includes(String(query.type))) throwError(400,'Invalid type filter.'); where.item_type = String(query.type) }
    if (query.action) { if (!Object.hasOwn(activityActions,String(query.action))) throwError(400,'Invalid action filter.'); where.action = String(query.action) }
    if (query.itemId) { if (!isUuid(String(query.itemId))) throwError(400,'Invalid item ID.'); where.item_id = String(query.itemId) }
    if (query.q) { if (typeof query.q !== 'string' || query.q.length > 120) throwError(400,'Search is too long.'); where.OR = [{ name: { contains: query.q, mode: 'insensitive' } },{ previous_name: { contains: query.q, mode: 'insensitive' } }] }
    const dates: { gte?: Date; lt?: Date } = {}
    for (const [param,key] of [['from','gte'],['to','lt']] as const) {
        if (!query[param]) continue
        const date = new Date(String(query[param]))
        if (!Number.isFinite(date.getTime())) throwError(400,'Invalid date filter.')
        dates[key] = date
    }
    if (dates.gte && dates.lt && dates.gte >= dates.lt) throwError(400,'Invalid date range.')
    if (dates.gte || dates.lt) where.created_at = dates
    if (query.cursor) {
        try {
            if (typeof query.cursor !== 'string' || query.cursor.length > 256) throw Error()
            const cursor = JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')), date = new Date(cursor.at)
            if (!isUuid(cursor.id) || !Number.isFinite(date.getTime())) throw Error()
            where.AND = [{ OR: [{ created_at: { lt: date } },{ created_at: date, id: { lt: cursor.id } }] }]
        } catch { throwError(400,'Invalid history cursor.') }
    }
    const rows = await prisma.activity_entries.findMany({ where, orderBy: [{ created_at: 'desc' },{ id: 'desc' }], take: 51 })
    const items = rows.slice(0,50), last = items.at(-1)
    setHeader(event,'Cache-Control','no-store')
    return { items: items.map(row => ({ id: row.id, itemId: row.item_id, type: row.item_type as ActivityKind, action: row.action as ActivityAction, name: row.name, previousName: row.previous_name, location: row.location, createdAt: row.created_at.toISOString() })), nextCursor: rows.length > 50 && last ? Buffer.from(JSON.stringify({ at: last.created_at.toISOString(), id: last.id })).toString('base64url') : null } satisfies ActivityPage
})
