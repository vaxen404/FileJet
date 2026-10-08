import { createReadStream } from "node:fs";
import { join } from "node:path";
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth";
import { throwError } from "~~/server/utils/error";

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-download:${session.userId}`, 30, 60 * 1000)

        const { fileId } = getQuery(event)

        if (!fileId || typeof fileId !== 'string') {
            throwError(400, 'Dosya ID gerekli.')
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

        setHeader(
            event,
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        )

        return sendStream(
            event,
            createReadStream(filePath)
        )
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(
            500,
            'Dosya indirilirken bilinmeyen bir hata oluştu.'
        )
    }
}) 