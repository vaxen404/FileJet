import argon2 from 'argon2'
import { prisma } from '~~/server/utils/prisma'
import { enforceRateLimit } from "~~/server/utils/rateLimit"
import { setAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async ( event) => {
    try {
        enforceRateLimit(event, 'auth-login', 10, 10 * 60 * 1000)

        const { username, password } = await readBody(event)

        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password
        ) {
            throw createError({
                statusCode: 401,
                message: 'Kullanıcı adı veya şifre hatalı.'
            })
        }

        const user = await prisma.users.findUnique({
            where: {
                username
            }
        })

        if (!user) {
            throw createError({
                statusCode: 401,
                message: 'Kullanıcı adı veya şifre hatalı.'
            })
        }

        const isPasswordCorrect = await argon2.verify(user.password_hash, password)

        if (!isPasswordCorrect) {
            throw createError({
                statusCode: 401,
                message: 'Kullanıcı adı veya şifre hatalı.'
            })
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

        throw createError({
            statusCode: 500,
            message: 'Giriş aşamasında bilinmeyen bir hata oluştu!'
        })
    }
})
