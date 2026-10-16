import { prisma } from "~~/server/utils/prisma"
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { storagePath } from "~~/server/utils/files";
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

        const file = await prisma.files.findFirst({
            where: {
                id: sharedItem.item_id,
                    user_id: sharedItem.user_id
            }
        })

        if (!file) {
            throwError(404, 'File not found.')
        }

        if (!file.mime_type) {
            throwError(415, 'File preview is not supported.')
        }

        const filePath = storagePath(file.storage_key)
        setHeader(event, 'Cache-Control', 'no-store')
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'")

        try {
            if (!(await stat(filePath)).isFile()) throwError(404, 'Stored file not found.')
        } catch (error: any) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throwError(404, 'Stored file not found.')
            throw error
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
        const isVideo = file.mime_type.startsWith('video/')

        if (!isImage && !isPdf && !isVideo) {
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

        if (isVideo) {
            const { size } = await stat(filePath)
            const range = getHeader(event, 'range')
            
            setHeader(event, 'Accept-Ranges', 'bytes')

            if (range) {
                const match = /^bytes=(\d*)-(\d*)$/.exec(range)

                if (!match || (!match[1] && !match[2])) {
                    setResponseStatus(event, 416)
                    setHeader(event, 'Content-Range', `bytes */${size}`)
                    return
                }

                const isSuffix = match[1] === ''
                const start = isSuffix
                    ? Math.max(0, size - Number(match[2]))
                    : Number(match[1])

                const end = isSuffix
                    ? size - 1
                    : match[2]
                        ? Math.min(Number(match[2]), size - 1)
                        : size - 1

                if (
                    !Number.isSafeInteger(start) ||
                    !Number.isSafeInteger(end) ||
                    start >= size ||
                    end >= size ||
                    start > end
                ) {
                    setResponseStatus(event, 416)
                    setHeader(event, 'Content-Range', `bytes */${size}`)
                    return
                }

                setResponseStatus(event, 206)
                setHeader(event, 'Content-Range', `bytes ${start}-${end}/${size}`)
                setHeader(event, 'Content-Length', end - start + 1)

                return await sendStream(
                    event,
                    createReadStream(filePath, { start, end })
                )
            }

            setHeader(event, 'Content-Length', size)
        }

        return await sendStream(
            event,
            createReadStream(filePath)
        )

    } catch (err: any) {
        if (err.statusCode) throw err
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') throwError(404, 'Stored file not found.')

        throwError(
            500,
            'An error occurred while previewing the shared file.'
        )
    }
})
