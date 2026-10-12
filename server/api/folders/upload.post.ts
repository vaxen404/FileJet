import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import {
    saveFileToStorage
} from '~~/server/utils/files'
import type { MultiPartData } from 'h3'
import type { folders } from '~~/src/generated/prisma/client'

type FilePart = MultiPartData & {
    name: 'files'
    filename: string
}

export default defineEventHandler(async (event) => {
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

        const files = formData.filter(
            (part): part is FilePart =>
                part.name === 'files' &&
                typeof part.filename === 'string' &&
                part.filename.length > 0
        )

        const paths = formData
            .filter(part => part.name === 'paths')
            .map(part => part.data.toString('utf8'))

        if (!files.length || files.length !== paths.length) {
            throwError(400, 'Invalid folder upload.')
        }

        const user = await prisma.users.findUnique({
            where: {
                id: session.userId
            },
            select: {
                storage_limit: true,
                storage_used: true
            }
        })

        if (!user) {
            throwError(401, 'Invalid session.')
        }

        const totalSize = files.reduce(
            (total, file) => total + file.data.length,
            0
        )

        const remainingStorage =
            BigInt(user.storage_limit ?? 0) -
            BigInt(user.storage_used ?? 0)

        if (BigInt(totalSize) > remainingStorage) {
            throwError(400, 'Not enough storage space.')
        }

        const validatedFiles: {
            part: FilePart
            fileName: string
            folderPath: string
        }[] = []

        for (let i = 0; i < files.length; i++) {
            const part = files[i]
            const relativePath = paths[i]

            if (!part || !relativePath) {
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
                    segment.includes('\0') ||
                    segment.length > 255
                )
            ) {
                throwError(400, 'Invalid folder path.')
            }

            const fileName = segments.pop()

            if (!fileName) {
                throwError(400, 'Invalid filename.')
            }

            validatedFiles.push({
                part,
                fileName,
                folderPath: segments.join('/')
            })
        }

        const folderCache = new Map<string, string>()

        const getFolderId = async (
            path: string
        ): Promise<string> => {
            const segments = path.split('/')

            let parentId: string | null = null
            let currentPath = ''

            for (const segment of segments) {
                currentPath = currentPath
                    ? `${currentPath}/${segment}`
                    : segment

                const cachedId: string | undefined =
                    folderCache.get(currentPath)

                if (cachedId) {
                    parentId = cachedId
                    continue
                }

                const existingFolder: folders | null =
                    await prisma.folders.findFirst({
                        where: {
                            user_id: session.userId,
                            parent_folder_id: parentId,
                            name: segment
                        }
                    })

                if (existingFolder) {
                    folderCache.set(
                        currentPath,
                        existingFolder.id
                    )

                    parentId = existingFolder.id
                    continue
                }

                const createdFolder: folders =
                    await prisma.folders.create({
                        data: {
                            user_id: session.userId,
                            parent_folder_id: parentId,
                            name: segment
                        }
                    })

                folderCache.set(
                    currentPath,
                    createdFolder.id
                )

                parentId = createdFolder.id
            }

            if (!parentId) {
                throwError(400, 'Invalid folder.')
            }

            return parentId
        }

        const uploadedFiles: string[] = []

        for (const item of validatedFiles) {
            const folderId = await getFolderId(
                item.folderPath
            )

            const { storageKey } = await saveFileToStorage(
                session.userId,
                item.part
            )

            const file = await prisma.files.create({
                data: {
                    user_id: session.userId,
                    folder_id: folderId,
                    name: item.fileName,
                    original_name: item.fileName,
                    mime_type: item.part.type ?? null,
                    size: BigInt(item.part.data.length),
                    storage_key: storageKey
                }
            })

            uploadedFiles.push(file.id)
        }

        await prisma.users.update({
            where: {
                id: session.userId
            },
            data: {
                storage_used: {
                    increment: BigInt(totalSize)
                }
            }
        })

        return {
            success: true,
            filesUploaded: uploadedFiles.length,
            foldersCreated: folderCache.size
        }

    } catch (err: any) {
        if (err.statusCode) throw err

        console.error('[FOLDER UPLOAD ERROR]', err)

        throwError(
            500,
            'An unknown error occurred while uploading the folder.'
        )
    }
})