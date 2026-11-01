import { createHmac, randomUUID } from 'node:crypto'
import { getCookie, setCookie, getHeader, getMethod, type H3Event } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
const cookieName = 'filejet_share_visitor'
export function shareActivityKey(secret: string, shareId: string, visitor: string, kind: 'view' | 'download', targetId: string) {
    return createHmac('sha256', secret).update(JSON.stringify([shareId, visitor, kind, targetId])).digest('hex')
}
export async function recordShareActivity(event: H3Event, share: { id: string; user_id: string }, kind: 'view' | 'download', targetId = '') {
    try {
        if (getMethod(event) === 'HEAD' || getHeader(event, 'range') || getHeader(event, 'DNT') === '1' || getHeader(event, 'Sec-GPC') === '1') return false
        if (getAuthSession(event)?.userId === share.user_id) return false
        const secret = process.env.AUTH_SECRET
        if (!secret || secret.length < 32) return false
        let visitor = getCookie(event, cookieName)
        if (!visitor || !/^[0-9a-f-]{36}$/i.test(visitor)) {
            visitor = randomUUID()
            setCookie(event, cookieName, visitor, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/shared', maxAge: 30 * 86400 })
        }
        const now = new Date(), day = new Date(now.toISOString().slice(0, 10)+'T00:00:00.000Z')
        const key = shareActivityKey(secret, share.id, visitor, kind, targetId)
        return await prisma.$transaction(async tx => {
            const added = await tx.share_event_keys.createMany({ data: [{ share_id: share.id, key, created_at: now }], skipDuplicates: true })
            if (!added.count) {
                const cutoff = new Date(now.getTime() - (kind === 'view' ? 30 * 60 * 1000 : 60 * 1000))
                const renewed = await tx.share_event_keys.updateMany({ where: { share_id: share.id, key, created_at: { lte: cutoff } }, data: { created_at: now } })
                if (!renewed.count) return false
            }
            await tx.share_daily_stats.upsert({
                where: { share_id_day: { share_id: share.id, day } },
                create: { share_id: share.id, day, views: kind === 'view' ? 1n : 0n, downloads: kind === 'download' ? 1n : 0n, last_viewed_at: kind === 'view' ? now : null, last_downloaded_at: kind === 'download' ? now : null },
                update: kind === 'view' ? { views: { increment: 1n }, last_viewed_at: now } : { downloads: { increment: 1n }, last_downloaded_at: now }
            })
            return true
        }, { maxWait: 1000, timeout: 3000 })
    } catch (error) {
        // Statistics are optional; their failure must never block file delivery.
        console.error('[SHARE STATISTICS]', error)
        return false
    }
}
export async function cleanupShareActivityKeys() {
    await prisma.share_event_keys.deleteMany({ where: { created_at: { lt: new Date(Date.now() - 2 * 86400000) } } })
}
