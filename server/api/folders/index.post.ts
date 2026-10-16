
import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { getFileParts, getTotalUploadSize, saveFileToStorage } from '~~/server/utils/files'
import { reserveStorage } from '~~/server/utils/storage'
import { resolve, sep } from 'node:path'
import { unlink } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
    const savedKeys: string[] = []

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

        const items = files.map((part, index) => {
            const relativePath = paths[index]

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

            const path = segments.join('/').toLowerCase()

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

        const result = await prisma.$transaction(async (tx) => {
            await reserveStorage(tx, session.userId, totalSize)

            const cache = new Map<string, string>()
            let foldersCreated = 0

            for (const item of items) {
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

                    let folderId: string

                    if (existingFolder) {
                        folderId = existingFolder.id
                    } else {
                        const createdFolder: { id: string } =
                            await tx.folders.create({
                                data: {
                                    user_id: session.userId,
                                    parent_folder_id: parentId,
                                    name
                                },
                                select: {
                                    id: true
                                }
                            })

                        folderId = createdFolder.id
                        foldersCreated++
                    }

                    parentId = folderId
                    cache.set(currentPath, folderId)
                }

                if (!parentId) {
                    throwError(400, 'Invalid folder path.')
                }

                const existingFile = await tx.files.findFirst({
                    where: {
                        user_id: session.userId,
                        folder_id: parentId,
                        original_name: {
                            equals: item.fileName,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        id: true
                    }
                })

                if (existingFile) {
                    throwError(
                        409,
                        `A file named "${item.fileName}" already exists in this folder.`
                    )
                }

                const { storageKey } = await saveFileToStorage(
                    session.userId,
                    item.part
                )

                savedKeys.push(storageKey)

                await tx.files.create({
                    data: {
                        user_id: session.userId,
                        folder_id: parentId,
                        name: item.fileName,
                        original_name: item.fileName,
                        mime_type: item.part.type ?? null,
                        size: BigInt(item.part.data.length),
                        storage_key: storageKey
                    }
                })
            }

            return {
                filesUploaded: items.length,
                foldersCreated
            }
        }, {
            maxWait: 5000,
            timeout: 60000
        })

        setResponseStatus(event, 201)

        return {
            success: true,
            ...result
        }
    } catch (error: unknown) {
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
                    console.error('[FOLDER CLEANUP ERROR]', cleanupError)
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
            throwError(409, 'A folder or file with this name already exists.')
        }

        console.error('[FOLDER UPLOAD ERROR]', error)

        throwError(500, 'An unknown error occurred while uploading the folder.')
    }
})
