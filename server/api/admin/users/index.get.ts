import { prisma } from '../../../utils/prisma'
import { requireAdmin, adminUserSelect, adminUserView } from '../../../utils/admin'
import { throwError } from '../../../utils/error'

export default defineEventHandler(async event => {
    await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    const query = getQuery(event)
    const page = Number(query.page ?? 1)
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throwError(400, 'Invalid page.')
    if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 100)) throwError(400, 'Invalid search.')
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const where = search ? { OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
    ] } : {}
    const [total, users] = await prisma.$transaction([
        prisma.users.count({ where }),
        prisma.users.findMany({ where, select: adminUserSelect, orderBy: [{ created_at: 'desc' }, { id: 'asc' }], take: 25, skip: (page - 1) * 25 })
    ])
    return { users: users.map(adminUserView), total, page, pageSize: 25 }
})
