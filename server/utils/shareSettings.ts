import { throwError } from './error'
import argon2 from 'argon2'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const settingsSchema = z
    .object({
        passwordAction: z.enum(['keep', 'set', 'remove']).optional(),
        password: z.string().min(4).max(128).optional(),
        expiresAt: z.iso.datetime({ offset: true }).nullable().optional()
    })
    .superRefine((value, ctx) => {
        if (value.passwordAction === 'set' && !value.password)
            ctx.addIssue({ code: 'custom', message: 'Enter a password of 4–128 characters.' })

        if (value.password && value.passwordAction !== 'set')
            ctx.addIssue({ code: 'custom', message: 'Invalid password action.' })
    })

export async function parseShareSettings(body: unknown, currentExpiration?: Date | null) {
    const parsed = settingsSchema.safeParse(body)

    if (!parsed.success)
        throwError(400, parsed.error.issues[0]?.message || 'Invalid share settings.')

    const value = parsed.data

    const data: {
        password_hash?: string | null
        expires_at?: Date | null
        access_version?: string
    } = {}

    if (value.expiresAt !== undefined) {
        const expires = value.expiresAt === null ? null : new Date(value.expiresAt)

        if (
            expires &&
            expires.getTime() <= Date.now() &&
            expires.getTime() !== currentExpiration?.getTime()
        ) {
            throwError(400, 'Expiration must be in the future.')
        }

        data.expires_at = expires
    }

    if (value.passwordAction === 'set') {
        data.password_hash = await argon2.hash(value.password!, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1
        })
    } else if (value.passwordAction === 'remove') data.password_hash = null

    if (Object.keys(data).length) data.access_version = randomUUID()

    return data
}
