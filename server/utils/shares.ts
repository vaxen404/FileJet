import { createError, getHeader, getRequestURL, getRouterParam, setHeader, type H3Event } from 'h3'
import { prisma } from './prisma'
import { isUuid } from './validation'
import { assertShareAccess, assertShareNotExpired } from './shareSecurity'

export function shareState(event: H3Event, share: { token: string, password_hash: string | null, expires_at: Date | null } | null) {
    return {
        url: share ? `${getRequestURL(event).origin}/shared/${share.token}` : null,
        hasPassword: !!share?.password_hash,
        expiresAt: share?.expires_at?.toISOString() ?? null,
        isExpired: !!share?.expires_at && share.expires_at.getTime() <= Date.now()
    }
}

export function assertShareOrigin(event: H3Event) {
    const origin = getHeader(event, 'origin')
    if (origin && origin !== getRequestURL(event).origin) throw createError({ statusCode: 403, message: 'Invalid request origin.' })
}

export async function getPublicShare(event: H3Event, requirePassword = true) {
    setHeader(event, 'Cache-Control', 'no-store')
    const token = getRouterParam(event, 'token')
    if (!token || !isUuid(token)) throw createError({ statusCode: 404, message: 'Shared item not found.' })
    const share = await prisma.shared_items.findUnique({ where: { token }, include: { users: { select: { username: true } } } })
    if (!share) throw createError({ statusCode: 404, message: 'Shared item not found.' })
    if (requirePassword) assertShareAccess(event, share)
    else assertShareNotExpired(event, share)
    return share
}

export async function requireOwnedShareItem(userId: string, itemId: unknown, itemType: unknown) {
    if (typeof itemId !== 'string' || !isUuid(itemId) || !['file', 'folder', 'note'].includes(String(itemType))) {
        throw createError({ statusCode: 400, message: 'Invalid shared item.' })
    }
    const where = { id: itemId, user_id: userId }
    const item = itemType === 'file' ? await prisma.files.findFirst({ where, select: { id: true } })
        : itemType === 'folder' ? await prisma.folders.findFirst({ where, select: { id: true } })
            : await prisma.notes.findFirst({ where, select: { id: true } })
    if (!item) throw createError({ statusCode: 404, message: 'Item not found.' })
    return { itemId, itemType: itemType as 'file' | 'folder' | 'note' }
}
