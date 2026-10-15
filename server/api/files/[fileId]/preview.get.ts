
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"
import { readFile, stat } from "node:fs/promises"
import { resolve, sep } from "node:path"
import { createReadStream } from "node:fs"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `files-preview:${session.userId}`, 60, 60 * 1000)

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
            throwError(404, 'File not found.')
        }

        if (!file.mime_type) {
            throwError(415, 'File preview is not supported.')
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
        setHeader(event, 'X-Content-Type-Options', 'nosniff')
        setHeader(event, 'Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'")

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
        const isVideo = file.mime_type.startsWith('video/')

        if (!isImage && !isPdf && !isVideo) {
            throwError(415, 'File preview is not supported.')
        }

        setHeader(event, 'Content-Type', file.mime_type)

        setHeader(
            event,
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
        )

        if (isVideo) {
            const { size } = fileStat
            const range = getHeader(event, 'range')

            setHeader(event, 'Accept-Ranges', 'bytes')

            if (range) {
                const match = /^bytes=(\d*)-(\d*)$/.exec(range)

                if (!match || (!match[1] && !match[2])) {
                    setResponseStatus(event, 416)
                    setHeader(event, 'Content-Range', `bytes */${size}`)
                    return ''
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
                    start > end
                ) {
                    setResponseStatus(event, 416)
                    setHeader(event, 'Content-Range', `bytes */${size}`)
                    return ''
                }

                setResponseStatus(event, 206)

                setHeader(
                    event,
                    'Content-Range',
                    `bytes ${start}-${end}/${size}`
                )

                setHeader(
                    event,
                    'Content-Length',
                    end - start + 1
                )

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

        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
            throwError(404, 'File not found in storage. Please upload it again.')
        }

        throwError(500, 'An error occurred while previewing the file.')
    }
})
