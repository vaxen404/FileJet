import { throwError } from './error'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie, setHeader, type H3Event } from 'h3'

export interface ShareAccess {
    token: string
    password_hash: string | null
    expires_at: Date | null
    access_version: string
}

const GRANT_TTL = 60 * 60 * 1000

const cookieName = (token: string) =>
    `fj_share_${createHash('sha256').update(token).digest('hex').slice(0, 20)}`

const secret = () => {
    const value = process.env.AUTH_SECRET

    if (!value || value.length < 32)
        throwError(500, 'Share authentication is not configured.')

    return value
}

const sign = (payload: string) =>
    createHmac('sha256', secret()).update(`filejet-share-v1:${payload}`).digest('base64url')

export function shareExpired(share: Pick<ShareAccess, 'expires_at'>, now = Date.now()) {
    return share.expires_at !== null && share.expires_at.getTime() <= now
}

export function createShareGrant(share: ShareAccess, now = Date.now()) {
    const expiresAt = Math.min(now + GRANT_TTL, share.expires_at?.getTime() ?? Infinity)

    const payload = Buffer.from(
        JSON.stringify({ token: share.token, version: share.access_version, expiresAt })
    ).toString('base64url')

    return `${payload}.${sign(payload)}`
}

export function validShareGrant(grant: string | undefined, share: ShareAccess, now = Date.now()) {
    if (!grant || grant.length > 2048 || shareExpired(share, now)) return false

    const parts = grant.split('.')

    if (parts.length !== 2) return false

    const [payload, signature] = parts as [string, string]
    const expected = Buffer.from(sign(payload))
    const actual = Buffer.from(signature)

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))

        return (
            data.token === share.token &&
            data.version === share.access_version &&
            Number.isFinite(data.expiresAt) &&
            data.expiresAt > now &&
            data.expiresAt <= now + GRANT_TTL
        )
    } catch {
        return false
    }
}

export function assertShareNotExpired(event: H3Event, share: ShareAccess) {
    setHeader(event, 'Cache-Control', 'no-store')

    if (shareExpired(share))
        throwError(410, 'This share link has expired.')
}

export function assertShareAccess(event: H3Event, share: ShareAccess) {
    assertShareNotExpired(event, share)

    if (share.password_hash && !validShareGrant(getCookie(event, cookieName(share.token)), share)) {
        throwError(401, 'A password is required for this share link.', {
            data: { passwordRequired: true }
        })
    }
}

export function setShareGrant(event: H3Event, share: ShareAccess) {
    assertShareNotExpired(event, share)
    setCookie(event, cookieName(share.token), createShareGrant(share), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.max(
            1,
            Math.floor(
                Math.min(GRANT_TTL, (share.expires_at?.getTime() ?? Infinity) - Date.now()) / 1000
            )
        )
    })
}
