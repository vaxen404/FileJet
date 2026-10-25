import { throwError } from '~~/server/utils/error'
import argon2 from 'argon2'
import { prisma } from '~~/server/utils/prisma'
import { enforceRateLimit } from '~~/server/utils/rateLimit'
import { setAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async event => {
    try {
        enforceRateLimit(event, 'auth-login', 10, 10 * 60 * 1000)

        const { username, password } = await readBody(event)

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password
        ) {
            throwError(401, 'Invalid username or password.')
        }

        const user = await prisma.users.findUnique({
            where: {
                username
            }
        })

        if (!user) {
            throwError(401, 'Invalid username or password.')
        }

        const isPasswordCorrect = await argon2.verify(user.password_hash, password)

        if (!isPasswordCorrect) {
            throwError(401, 'Invalid username or password.')
        }

        setAuthSession(event, user.id)

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                storageLimit: user.storage_limit?.toString() ?? '0',
                storageUsed: user.storage_used?.toString() ?? '0'
            }
        }
    } catch (err: any) {
        console.error('[AUTH LOGIN ERROR]', err)

        if (err.statusCode) throw err

        throwError(500, 'An unexpected error occurred while logging in.')
    }
})
