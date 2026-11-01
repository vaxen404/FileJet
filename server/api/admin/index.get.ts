import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/admin'

export default defineEventHandler(async event => {
    await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    const [users, admins, files, folders, notes, shares, storage] = await Promise.all([
        prisma.users.count(), prisma.users.count({ where: { role: 'ADMIN' } }), prisma.files.count(),
        prisma.folders.count(), prisma.notes.count(), prisma.shared_items.count(),
        prisma.users.aggregate({ _sum: { storage_used: true, storage_limit: true } })
    ])
    return { users, admins, files, folders, notes, shares,
        storageUsed: (storage._sum.storage_used ?? 0n).toString(),
        storageLimit: (storage._sum.storage_limit ?? 0n).toString() }
})
