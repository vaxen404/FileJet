import crypto from 'node:crypto'
import type { H3Event } from 'h3'

const SESSION_COOKIE = 'filejet_session'
const SESSION_TTL = 60 * 60 * 24 * 7

type SessionPayload = {
    userId: string
    expiresAt: number
}

function getSessionSecret() {
    const secret = process.env.AUTH_SECRET

    if (!secret || secret.length < 32) {
        throw createError({
            statusCode: 500,
            message: 'AUTH_SECRET eksik veya çok kısa.'
        })
    }

    return secret
}

function sign(value: string) {
    return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url')
}

export function setAuthSession(event: H3Event, userId: string) {
    const payload: SessionPayload = {
        userId,
        expiresAt: Date.now() + SESSION_TTL * 1000
    }

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

    const signature = sign(encodedPayload)

    const token = `${encodedPayload}.${signature}`

    setCookie(event, SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL
    })
}

export function clearAuthSession(event: H3Event) {
    deleteCookie(event, SESSION_COOKIE, {
        path: '/'
    })
}

export function getAuthSession(event: H3Event): SessionPayload | null {
    const session = getCookie(event, SESSION_COOKIE)

    if (!session) {
        return null
    }

    const [encodedPayload, signature] = session.split('.')

    if (!encodedPayload || !signature) {
        return null
    }

    const expectedSignature = sign(encodedPayload)

    if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
        return null
    }

    try {
        const payload = JSON.parse(
            Buffer.from(encodedPayload, 'base64url').toString()
        ) as SessionPayload

        if (!payload.userId) {
            return null
        }

        if (payload.expiresAt <= Date.now()) {
            clearAuthSession(event)

            return null
        }

        return payload
    } catch {
        return null
    }
}
