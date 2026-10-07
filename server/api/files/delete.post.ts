import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { join } from "node:path"
import { unlink } from "node:fs/promises"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-delete:${session.userId}`, 10, 60 * 1000)

        const { fileId } = await readBody(event)

        if (!fileId) {
            throwError(400, 'Dosya ID gerekli')
        }

        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                user_id: session.userId
            }
        })

        if (!file) {
            throwError(404, 'Dosya bulunamadı.')
        }

        const filePath = join(
            process.cwd(),
            'storage',
            file.storage_key
        )

        await unlink(filePath)

        await prisma.files.delete({
            where: {
                id: file.id
            }
        })

        await prisma.users.update({
            where: {
                id: session.userId
            },
            data: {
                storage_used: {
                    decrement: file.size
                }
            }
        })

        return {
            success: true
        }
        
    } catch (err: any) {
        console.log(err.message);
        if (err.statusCode) throw err

        throwError(500, 'Dosya silinirken bilinmeyen bir hata oluştu.')
    }
})