
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { getFileParts, getTotalUploadSize } from '~~/server/utils/files'
import { stageUpload } from '~~/server/utils/uploads'
import { reserveStorage } from '~~/server/utils/storage'

export default defineEventHandler(async (event) => {
    let batch: Awaited<ReturnType<typeof stageUpload>> | undefined

    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(
            event,
            `folders-upload:${session.userId}`,
            10,
            60 * 1000
        )

        const formData = await readMultipartFormData(event) ?? []
        const files = getFileParts(formData)

        const paths = formData
            .filter(part => part.name === 'paths' && !part.filename)
            .map(part => part.data.toString('utf8'))

        if (!files.length || files.length !== paths.length) {
            throwError(400, 'Invalid folder upload.')
        }

        const seen = new Set<string>()

        const items = files.map((part, i) => {
            const relativePath = paths[i]

            if (!relativePath) {
                throwError(400, 'Invalid folder path.')
            }

            const segments = relativePath
                .replace(/\\/g, '/')
                .split('/')

            if (
                segments.length < 2 ||
                segments.length > 20 ||
                segments.some(segment =>
                    !segment ||
                    segment === '.' ||
                    segment === '..' ||
                    /[\0:]/.test(segment) ||
                    Buffer.byteLength(segment, 'utf8') > 255
                )
            ) {
                throwError(400, 'Invalid folder path.')
            }

            const path = segments.join('/')

            if (seen.has(path)) {
                throwError(409, 'Duplicate file path in upload.')
            }

            seen.add(path)

            const fileName = segments.pop()!

            return {
                part,
                fileName,
                segments
            }
        })

        const totalSize = BigInt(getTotalUploadSize(files))

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

        batch = await stageUpload(session.userId, files)

        const keys = batch.keys

        const result = await batch.commit(async (tx) => {
            await reserveStorage(
                tx,
                session.userId,
                totalSize
            )

            const cache = new Map<string, string>()
            let foldersCreated = 0

            for (let i = 0; i < items.length; i++) {
                const item = items[i]!

                let parentId: string | null = null
                let currentPath = ''

                for (const name of item.segments) {
                    currentPath = currentPath
                        ? `${currentPath}/${name}`
                        : name

                    const cachedId = cache.get(currentPath)

                    if (cachedId) {
                        parentId = cachedId
                        continue
                    }

                    const existingFolder: { id: string } | null =
                        await tx.folders.findFirst({
                            where: {
                                user_id: session.userId,
                                parent_folder_id: parentId,
                                name
                            },
                            select: {
                                id: true
                            }
                        })

                    const folder: { id: string } =
                        existingFolder ?? await tx.folders.create({
                            data: {
                                user_id: session.userId,
                                parent_folder_id: parentId,
                                name
                            },
                            select: {
                                id: true
                            }
                        })

                    if (!existingFolder) {
                        foldersCreated++
                    }

                    parentId = folder.id
                    cache.set(currentPath, parentId)
                }

                const existingFile = await tx.files.findFirst({
                    where: {
                        user_id: session.userId,
                        folder_id: parentId,
                        original_name: item.fileName
                    },
                    select: {
                        id: true
                    }
                })

                if (existingFile) {
                    throwError(409, 'A file with this path already exists.')
                }

                await tx.files.create({
                    data: {
                        user_id: session.userId,
                        folder_id: parentId,
                        name: item.fileName,
                        original_name: item.fileName,
                        mime_type: item.part.type ?? null,
                        size: BigInt(item.part.data.length),
                        storage_key: keys[i]!
                    }
                })
            }

            return {
                filesUploaded: items.length,
                foldersCreated
            }
        })

        await batch.finish()
        batch = undefined

        setResponseStatus(event, 201)

        return {
            success: true,
            ...result
        }
    } catch (error: unknown) {
        if (batch) {
            try {
                await batch.rollback()
            } catch (rollbackError) {
                console.error('[FOLDER UPLOAD ROLLBACK ERROR]', rollbackError)
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
            throwError(409, 'A folder with this name already exists.')
        }

        console.error('[FOLDER UPLOAD ERROR]', error)

        throwError(500, 'An unknown error occurred while uploading the folder.')
    }
})
