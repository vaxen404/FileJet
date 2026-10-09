import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { createReadStream } from "node:fs"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `files-preview:${session.userId}`, 60, 60 * 1000)

        const { fileId } = getQuery(event)

        if (!fileId || typeof fileId !== 'string') {
            throwError(400, 'File ID is required.')
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

        if (!file.mime_type) {
            throwError(415, 'File preview is not supported.')
        }

        const filePath = join(
            process.cwd(),
            'storage',
            file.storage_key
        )

        if (file.mime_type.startsWith('text/')) {
            const content = await readFile(filePath, 'utf-8')

            setHeader(
                event,
                'Content-Type',
                `${file.mime_type}; charset=utf-8`
            )

            return content
        }

        const isImage = file.mime_type.startsWith('image/')
        const isPdf = file.mime_type === 'application/pdf'

        if (!isImage && !isPdf) {
            throwError(415, 'File preview is not supported.')
        }

        setHeader(
            event,
            'Content-Type',
            file.mime_type            
        )

        setHeader(
            event,
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        )

        return sendStream(
            event,
            createReadStream(filePath)
        )
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'An error occurred while previewing the file.')
    }
})