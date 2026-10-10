import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"
import { join } from "node:path"
import { unlink } from "node:fs/promises"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (!body || typeof body !== 'object') {
            throwError(400, 'Invalid request body.')
        }

        const { fileId } = body

        if (typeof fileId !== 'string') {
            throwError(400, 'Invalid file ID.')
        }

        if (!isUuid(fileId)) {
            throwError(400, 'Invalid file ID.')
        }

        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                user_id: session.userId
            }
        })

        if (!file) {
            throwError(404, 'File not found.')
        }

        const filePath = join(
            process.cwd(),
            'storage',
            file.storage_key
        )

        await unlink(filePath)

        await prisma.$transaction([
            prisma.shared_items.deleteMany({
                where: {
                    user_id: session.userId,
                    item_id: file.id,
                    item_type: 'file'
                }
            }),

            prisma.files.delete({
                where: {
                    id: file.id
                }
            }),

            prisma.users.update({
                where: {
                    id: session.userId
                },
                data: {
                    storage_used: {
                        decrement: file.size
                    }
                }
            })
        ])


        return {
            success: true
        }
        
    } catch (err: any) {
        console.log(err.message);
        if (err.statusCode) throw err

        throwError(500, 'Dosya silinirken bilinmeyen bir hata oluştu.')
    }
})