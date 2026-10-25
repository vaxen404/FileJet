import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { enforceRateLimit } from '~~/server/utils/rateLimit'
import { isUuid } from '~~/server/utils/validation'
import { assertShareOrigin } from '~~/server/utils/shares'
import { readShareBody } from '~~/server/utils/shareBody'

export default defineEventHandler(async event => {
    try {
        assertShareOrigin(event)

        const session = getAuthSession(event)

        if (!session) throwError(401, 'You need to be logged in.')

        enforceRateLimit(event, `shared-remove:${session.userId}`, 10, 60 * 1000)

        const body = await readShareBody(event)

        if (!Array.isArray(body.shareIds) || !body.shareIds.length || body.shareIds.length > 200) {
            throwError(400, 'Select between 1 and 200 share links.')
        }

        if (body.shareIds.some((id: unknown) => typeof id !== 'string' || !isUuid(id))) {
            throwError(400, 'Invalid share link ID.')
        }

        const shareIds = [...new Set<string>(body.shareIds.map((id: string) => id.toLowerCase()))]

        const deletedIds = await prisma.$transaction(async tx => {
            const where = { user_id: session.userId, id: { in: shareIds } }
            const shares = await tx.shared_items.findMany({ where, select: { id: true } })

            if (shares.length !== shareIds.length) {
                throwError(404, 'One or more selected share links no longer exist. Refresh and try again.')
            }

            const result = await tx.shared_items.deleteMany({ where })

            if (result.count !== shareIds.length) {
                throwError(409, 'The selected links changed. Refresh and try again.')
            }

            return shares.map(share => share.id)
        })

        return { success: true, deletedIds, deletedCount: deletedIds.length }
    } catch (error: any) {
        if (error.statusCode) throw error

        throwError(500, 'Could not remove the selected share links.')
    }
})
