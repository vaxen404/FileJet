import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)   
    
        if (!session) {
            throw createError({
                statusCode: 401,
                message: 'Oturum açmanız gerekiyor.'
            })
        }
    
        const user = await prisma.users.findUnique({
            where: {
                id: session.userId
            },
            select: {
        id: true,
        username: true,
        email: true,
        storage_limit: true,
        storage_used: true,
        created_at: true
    }
        })
    
        if (!user) {
            throw createError({
                statusCode: 401,
                message: 'Geçersiz oturum.'  
            })
        }
    
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            storageLimit: user.storage_limit?.toString() ?? '0',
            storageUsed: user.storage_used?.toString() ?? '0',
            createdAt: user.created_at
        }

    } catch (err: any) {
        if (err.statusCode) throw err

        throw createError({
            statusCode: 500,
            message: 'Kullanıcı bilgileri alınırken bir hata oluştu.'
        })
    }
})