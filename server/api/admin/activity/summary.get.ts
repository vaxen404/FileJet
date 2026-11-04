import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/admin'
import { adminEventView } from '../../../utils/adminEvents'
import { adminUserActivitySelect, adminUserActivityView } from '../../../utils/adminHistory'
export default defineEventHandler(async event => {
    await requireAdmin(event)
    setHeader(event,'Cache-Control','private, no-store')
    const now = new Date(), since = new Date(now.getTime()-86400000)
    const start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-6))
    const [activity, adminActions, daily, recent, adminRecent] = await prisma.$transaction(async tx => Promise.all([
        tx.$queryRaw<{total:bigint;accounts:bigint}[]>`SELECT count(*) AS total, count(DISTINCT user_id) AS accounts FROM activity_entries WHERE created_at >= ${since}`,
        tx.admin_events.count({where:{created_at:{gte:since}}}),
        tx.$queryRaw<{day:string;total:bigint}[]>`SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS total FROM activity_entries WHERE created_at >= ${start} GROUP BY 1 ORDER BY 1`,
        tx.activity_entries.findMany({select:adminUserActivitySelect,orderBy:[{created_at:'desc'},{id:'desc'}],take:6}),
        tx.admin_events.findMany({orderBy:[{created_at:'desc'},{id:'desc'}],take:4})
    ]),{isolationLevel:'RepeatableRead'})
    return {
        changes24h:Number(activity[0]?.total??0n), activeAccounts24h:Number(activity[0]?.accounts??0n), adminActions24h:adminActions,
        days:Array.from({length:7},(_,index)=>{const day=new Date(start.getTime()+index*86400000).toISOString().slice(0,10);return {day,count:Number(daily.find(row=>row.day===day)?.total??0n)}}),
        recent:recent.map(adminUserActivityView),adminRecent:adminRecent.map(adminEventView)
    }
})
