
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { getFileParts, getTotalUploadSize, saveFileToStorage } from '~~/server/utils/files'
import { reserveStorage } from '~~/server/utils/storage'
import { resolve, sep } from 'node:path'
import { unlink } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
    const savedKeys: string[] = []
    let committed = false

    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(
            event,
            `files-upload:${session.userId}`,
            10,
            60 * 1000
        )

        const formData = await readMultipartFormData(event) ?? []
        const parts = getFileParts(formData)

        if (parts.length < 1 || parts.length > 6) {
            throwError(400, 'Upload between 1 and 6 files.')
        }

        const names = new Set<string>()

        for (const part of parts) {
            const name = part.filename

            if (
                name === '.' ||
                name === '..' ||
                /[/\\\0]/.test(name) ||
                Buffer.byteLength(name, 'utf8') > 255
            ) {
                throwError(400, 'Invalid filename.')
            }

            const normalizedName = name.toLowerCase()

            if (names.has(normalizedName)) {
                throwError(409, `Duplicate file: ${name}`)
            }

            names.add(normalizedName)
        }

        const totalSize = BigInt(getTotalUploadSize(parts))

        const user = await prisma.users.findUnique({
            where: {
                id: session.userId
            },
            select: {
                storage_used: true,
                storage_limit: true
            }
        })

        if (!user) {
            throwError(401, 'Invalid session.')
        }

        if (
            (user.storage_used ?? 0n) + totalSize >
            (user.storage_limit ?? 0n)
        ) {
            throwError(400, 'Not enough storage space.')
        }

        const uploadedFiles = await prisma.$transaction(async (tx) => {
            await reserveStorage(tx, session.userId, totalSize)

            const result: {
                id: string
                name: string
                original_name: string
                mime_type: string | null
                size: string
                storage_key: string
            }[] = []

            for (const part of parts) {
                const existing = await tx.files.findFirst({
                    where: {
                        user_id: session.userId,
                        folder_id: null,
                        original_name: {
                            equals: part.filename,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        id: true
                    }
                })

                if (existing) {
                    throwError(
                        409,
                        `A file named "${part.filename}" already exists.`
                    )
                }

                const { storageKey } = await saveFileToStorage(
                    session.userId,
                    part
                )

                savedKeys.push(storageKey)

                const file = await tx.files.create({
                    data: {
                        user_id: session.userId,
                        folder_id: null,
                        name: part.filename,
                        original_name: part.filename,
                        mime_type: part.type ?? null,
                        size: BigInt(part.data.length),
                        storage_key: storageKey
                    }
                })

                result.push({
                    ...file,
                    size: file.size.toString()
                })
            }

            return result
        }, {
            maxWait: 5000,
            timeout: 60000
        })

        committed = true

        setResponseStatus(event, 201)

        return {
            success: true,
            files: uploadedFiles
        }
    } catch (error: unknown) {
        if (!committed) {
            const storageRoot = resolve(process.cwd(), 'storage')

            for (const storageKey of savedKeys) {
                const filePath = resolve(storageRoot, storageKey)

                if (!filePath.startsWith(storageRoot + sep)) {
                    console.error('[INVALID STORAGE PATH]', storageKey)
                    continue
                }

                try {
                    await unlink(filePath)
                } catch (cleanupError: unknown) {
                    if (
                        cleanupError &&
                        typeof cleanupError === 'object' &&
                        'code' in cleanupError &&
                        cleanupError.code !== 'ENOENT'
                    ) {
                        console.error('[FILE CLEANUP ERROR]', cleanupError)
                    }
                }
            }
        }

        if (
            error &&
            typeof error === 'object' &&
            'statusCode' in error
        ) {
            throw error
        }

        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002'
        ) {
            throwError(409, 'A file with this name already exists.')
        }

        console.error('[FILE UPLOAD ERROR]', error)

        throwError(500, 'An unknown error occurred while uploading the file.')
    }
})
