import argon2 from 'argon2'
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession, setAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { enforceRateLimit } from '~~/server/utils/rateLimit'
import { passwordChangeSchema } from '~~/shared/schemas/account'

export default defineEventHandler(async event => {
    try {
        const session = getAuthSession(event)

        if (!session) throwError(401, 'You need to be logged in.')

        enforceRateLimit(event, `account-password:${session.userId}`, 5, 10 * 60 * 1000)

        const parsed = passwordChangeSchema.safeParse(await readBody(event))

        if (!parsed.success) throwError(400, parsed.error.issues[0]?.message || 'Invalid password details.')

        const account = await prisma.users.findUnique({
            where: { id: session.userId },
            select: { password_hash: true }
        })

        if (!account) throwError(401, 'Invalid session.')

        if (!(await argon2.verify(account.password_hash, parsed.data.currentPassword))) {
            throwError(403, 'Your current password is incorrect.')
        }

        const passwordHash = await argon2.hash(parsed.data.newPassword, { type: argon2.argon2id })
        const updated = await prisma.users.updateMany({
            where: { id: session.userId, password_hash: account.password_hash },
            data: { password_hash: passwordHash }
        })

        if (updated.count !== 1) throwError(409, 'Your password changed. Reload the page and try again.')

        setAuthSession(event, session.userId)

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error

        throwError(500, 'Your password could not be updated.')
    }
})
