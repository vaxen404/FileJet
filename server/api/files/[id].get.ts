import { prisma } from "~~/server/utils/prisma";
import { getAuthSession } from "~~/server/utils/auth";
import { throwError } from "~~/server/utils/error";

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        const fileId = getRouterParam(event, 'id')

        if (!fileId) {
            throwError(400, 'File ID is required.')
        }

        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                user_id: session.userId,

            }
        })

        if (!file) {
            throwError(404, 'File not found.')
        }

        return {
            ...file,
            size: Number(file.size)
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while getting the file.')
    }
})