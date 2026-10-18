import { prisma } from "~~/server/utils/prisma";
import { getAuthSession } from "~~/server/utils/auth";
import { throwError } from "~~/server/utils/error";

export default defineEventHandler(async ( event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const items = await prisma.trash.findMany({
            where: {
                user_id: session.userId
            },
            orderBy: {
                deleted_at: 'desc'
            }
        })

        return {
            items: items.map(item => ({
                ...item,
                size: item.size?.toString() ?? null
            }))
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Failed to fetch trash items.')
    }
})
