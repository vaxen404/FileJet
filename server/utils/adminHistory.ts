import type { Prisma } from '~~/src/generated/prisma/client'
import { prisma } from './prisma'
import { throwError } from './error'
import { isUuid } from './validation'
import { adminEventView } from './adminEvents'
import { adminActionLabels, type AdminHistoryPage, type AdminUserActivity } from '../../shared/types/adminActivity'
import { activityActions, type ActivityAction, type ActivityKind } from '../../shared/types/activity'

function text(query: Record<string, unknown>, name: string, max = 120) {
    const value = query[name]
    if (value === undefined || value === '') return ''
    if (typeof value !== 'string' || value.length > max) throwError(400,`Invalid ${name} filter.`)
    return value.trim()
}
export const adminUserActivitySelect = { id: true, user_id: true, item_id: true, item_type: true, action: true, name: true, previous_name: true, location: true, created_at: true, users: { select: { username: true } } } as const
export const adminUserActivityView = (row: Prisma.activity_entriesGetPayload<{ select: typeof adminUserActivitySelect }>): AdminUserActivity => ({ id: row.id, userId: row.user_id, username: row.users.username, itemId: row.item_id, type: row.item_type as ActivityKind, action: row.action as ActivityAction, name: row.name, previousName: row.previous_name, location: row.location, createdAt: row.created_at.toISOString() })
export async function adminHistory(query: Record<string, unknown>): Promise<AdminHistoryPage> {
    const source = text(query,'source',10) || 'user'
    if (!['user','admin'].includes(source)) throwError(400,'Invalid history source.')
    const q = text(query,'q'), account = text(query,'user',100), actor = text(query,'actor',100), action = text(query,'action',32), type = text(query,'type',16)
    const userId = text(query,'userId',36), actorId = text(query,'actorId',36)
    if ((userId && !isUuid(userId)) || (actorId && !isUuid(actorId))) throwError(400,'Invalid account ID.')
    const limit = query.limit === undefined ? 50 : Number(query.limit)
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throwError(400,'Invalid page size.')
    const dates: { gte?: Date; lt?: Date } = {}
    for (const [name,key] of [['from','gte'],['to','lt']] as const) {
        const value = text(query,name,40)
        if (value) { const date = new Date(value); if (!Number.isFinite(date.getTime())) throwError(400,'Invalid date filter.'); dates[key] = date }
    }
    if (dates.gte && dates.lt && dates.gte >= dates.lt) throwError(400,'Invalid date range.')
    let cursor: { at: Date; id: string } | undefined
    const encoded = text(query,'cursor',256)
    if (encoded) {
        try { const value = JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')); const date = new Date(value.at); if (!isUuid(value.id) || !Number.isFinite(date.getTime())) throw Error(); cursor = { at: date, id: value.id } }
        catch { throwError(400,'Invalid history cursor.') }
    }
    const position = cursor ? [{ OR: [{ created_at: { lt: cursor.at } },{ created_at: cursor.at, id: { lt: cursor.id } }] }] : undefined
    const next = (rows: {id: string; created_at: Date}[]) => rows.length > limit ? Buffer.from(JSON.stringify({id:rows[limit-1]!.id,at:rows[limit-1]!.created_at.toISOString()})).toString('base64url') : null
    if (source === 'user') {
        if (actor || actorId) throwError(400,'Actor filter applies to admin actions.')
        if (action && !Object.hasOwn(activityActions,action)) throwError(400,'Invalid action filter.')
        if (type && !['file','folder','note','inbox','batch'].includes(type)) throwError(400,'Invalid type filter.')
        const where: Prisma.activity_entriesWhereInput = { ...(userId ? {user_id:userId}:{}), ...(account ? {users:{username:{contains:account,mode:'insensitive'}}}:{}), ...(action?{action}:{}), ...(type?{item_type:type}:{}), ...(Object.keys(dates).length?{created_at:dates}:{}), ...(position?{AND:position}:{}) }
        if (q) where.OR = [{name:{contains:q,mode:'insensitive'}},{previous_name:{contains:q,mode:'insensitive'}}]
        const rows = await prisma.activity_entries.findMany({where,select:adminUserActivitySelect,orderBy:[{created_at:'desc'},{id:'desc'}],take:limit+1})
        return {source:'user',items:rows.slice(0,limit).map(adminUserActivityView),nextCursor:next(rows)}
    }
    if (type) throwError(400,'Item type applies to user activity.')
    if (action && !Object.hasOwn(adminActionLabels,action)) throwError(400,'Invalid action filter.')
    const where: Prisma.admin_eventsWhereInput = { ...(userId?{target_user_id:userId}:{}), ...(actorId?{actor_id:actorId}:{}), ...(account?{target_username:{contains:account,mode:'insensitive'}}:{}), ...(actor?{actor_username:{contains:actor,mode:'insensitive'}}:{}), ...(action?{action}:{}), ...(Object.keys(dates).length?{created_at:dates}:{}), ...(position?{AND:position}:{}) }
    if (q) where.OR = [{target_username:{contains:q,mode:'insensitive'}},{actor_username:{contains:q,mode:'insensitive'}}]
    const rows = await prisma.admin_events.findMany({where,orderBy:[{created_at:'desc'},{id:'desc'}],take:limit+1})
    return {source:'admin',items:rows.slice(0,limit).map(adminEventView),nextCursor:next(rows)}
}
