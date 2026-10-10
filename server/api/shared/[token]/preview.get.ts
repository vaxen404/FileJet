import { prisma } from "~~/server/utils/prisma"
import { createReadStream } from "node:fs";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { throwError } from "~~/server/utils/error"

export default defineEventHandler(async (event) => {
    try {
        const token = getRouterParam(event, 'token')

        if (!token) {
            throwError(400, 'Share token is required.')
        }

        enforceRateLimit(event, `shared-preview:${token}`, 120, 60 * 1000)

        const sharedItem = await prisma.shared_items.findUnique({
            where: {
                token
            }
        })

        if (!sharedItem) {
            throwError(404, 'Shared item not found.')
        }

        if (sharedItem.item_type !== 'file') {
            throwError(400, 'This shared item is not a file.')
        }

        const file = await prisma.files.findUnique({
            where: {
                id: sharedItem.item_id
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

        try {
            await access(filePath)
        } catch {
            throwError(404, 'Stored file not found.')
        }

        if (file.mime_type.startsWith('text/')) {
            const content = await readFile(
                filePath,
                'utf-8'
            )

            setHeader(
                event,
                'Content-Type',
                'text/plain; charset=utf-8'
            )

            setHeader(
                event,
                'X-Content-Type-Options',
                'nosniff'
            )

            return content
        }

        const allowedImages = [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif'
        ]

        const isImage = allowedImages.includes(file.mime_type)
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
            'X-Content-Type-Options',
            'nosniff'
        )


        setHeader(
            event,
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        )

        await sendStream(
            event,
            createReadStream(filePath)
        )

        return
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(
            500,
            'An error occurred while previewing the shared file.'
        )
    }
})