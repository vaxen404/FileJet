import { throwError } from './error'
import { getHeader, getRequestURL, getRouterParam, setHeader, type H3Event } from 'h3'
import { prisma } from './prisma'
import { isUuid } from './validation'
import { assertShareAccess, assertShareNotExpired } from './shareSecurity'

export function shareState(
    event: H3Event,
    share: { token: string; password_hash: string | null; expires_at: Date | null } | null
) {
    return {
        url: share ? `${getRequestURL(event).origin}/shared/${share.token}` : null,
        hasPassword: !!share?.password_hash,
        expiresAt: share?.expires_at?.toISOString() ?? null,
        isExpired: !!share?.expires_at && share.expires_at.getTime() <= Date.now()
    }
}

export function assertShareOrigin(event: H3Event) {
    const origin = getHeader(event, 'origin')

    if (origin && origin !== getRequestURL(event).origin)
        throwError(403, 'Invalid request origin.')
}

export async function getPublicShare(event: H3Event, requirePassword = true) {
    setHeader(event, 'Cache-Control', 'no-store')
    const token = getRouterParam(event, 'token')

    if (!token || !isUuid(token))
        throwError(404, 'Shared item not found.')

    const share = await prisma.shared_items.findUnique({
        where: { token },
        include: { users: { select: { username: true } } }
    })

    if (!share) throwError(404, 'Shared item not found.')

    if (requirePassword) assertShareAccess(event, share)
    else assertShareNotExpired(event, share)

    return share
}

export async function requireOwnedShareItem(userId: string, itemId: unknown, itemType: unknown) {
    if (
        typeof itemId !== 'string' ||
        !isUuid(itemId) ||
        !['file', 'folder', 'note'].includes(String(itemType))
    ) {
        throwError(400, 'Invalid shared item.')
    }

    const where = { id: itemId, user_id: userId }

    const item =
        itemType === 'file'
            ? await prisma.files.findFirst({ where, select: { id: true } })
            : itemType === 'folder'
              ? await prisma.folders.findFirst({ where, select: { id: true } })
              : await prisma.notes.findFirst({ where, select: { id: true } })

    if (!item) throwError(404, 'Item not found.')

    return { itemId, itemType: itemType as 'file' | 'folder' | 'note' }
}
