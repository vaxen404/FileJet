import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth";
import { throwError } from "~~/server/utils/error";
import { isUuid } from "~~/server/utils/validation";

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        const method = getMethod(event)
        const rateLimitKey = method === 'HEAD' ? 'files-download-check' : 'files-download'
        enforceRateLimit(event, `${rateLimitKey}:${session.userId}`, 30, 60 * 1000)

        const fileId = getRouterParam(event, 'fileId')

        if (!fileId || !isUuid(fileId)) {
            throwError(400, 'Invalid file ID.')
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

        const storageRoot = resolve(process.cwd(), 'storage')
        const filePath = resolve(storageRoot, file.storage_key)

        if (!filePath.startsWith(storageRoot + sep)) {
            throwError(400, 'Invalid file storage path.')
        }

        const fileStat = await stat(filePath)

        if (!fileStat.isFile()) {
            throwError(404, 'File not found in storage. Please upload it again.')
        }

        setHeader(event, 'Cache-Control', 'no-store')

        setHeader(event, 'Content-Type', 'application/octet-stream')
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Length', fileStat.size)

        if (method === 'HEAD') return ''

        setHeader(
            event,
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        )

        return await sendStream(
            event,
            createReadStream(filePath)
        )
    } catch (err: any) {
        if (err.statusCode) throw err

        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
            throwError(404, 'File not found in storage. Please upload it again.')
        }

        throwError(
            500,
            'Dosya indirilirken bilinmeyen bir hata oluştu.'
        )
    }
})
