import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `files-upload:${session.userId}`, 10, 60 * 1000 )

        const body = await readBody(event)

        if (!body || !body.title || !body.content) {
            throwError
            (400, 'Missing data.')
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, '')
    }
})
