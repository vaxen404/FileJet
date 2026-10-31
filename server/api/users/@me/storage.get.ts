import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { summarizeStorageUsage } from '~~/server/utils/storageUsage'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)
    if (!session) throwError(401, 'You need to be logged in.')
    setHeader(event, 'Cache-Control', 'private, no-store')

    try {
        return await prisma.$transaction(async tx => {
            const where = { user_id: session.userId }
            const [user, files, notes, trash, pending] = await Promise.all([
                tx.users.findUnique({ where: { id: session.userId }, select: { storage_limit: true } }),
                tx.files.groupBy({ by: ['mime_type'], where, _sum: { size: true } }),
                tx.notes.aggregate({ where, _sum: { size: true } }),
                tx.trash.groupBy({
                    by: ['item_type', 'mime_type'],
                    where: { ...where, item_type: { in: ['file', 'note'] } },
                    _sum: { size: true }
                }),
                tx.request_uploads.groupBy({ by: ['mime_type'], where: { status: 'pending', request: where }, _sum: { size: true } })
            ])
            if (!user) throwError(401, 'Invalid session.')
            return summarizeStorageUsage({ limit: user.storage_limit, files, notes: notes._sum.size, trash, pending })
        }, { isolationLevel: 'RepeatableRead' })
    } catch (error: any) {
        if (error.statusCode) throw error
        throwError(500, 'Failed to load storage usage.')
    }
})
