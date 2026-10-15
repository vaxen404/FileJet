import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { unlink } from "node:fs/promises";
import path from "node:path"
import { getFileParts, getTotalUploadSize, saveFileToStorage } from "~~/server/utils/files";

export default defineEventHandler(async (event) => {
    const savedFiles: string[] = []

    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `files-upload:${session.userId}`, 10, 60 * 1000 )

        const formData = await readMultipartFormData(event) ?? []
        const fileParts = getFileParts(formData)

        if (!fileParts.length) {
            throwError(400, 'No files uploaded.')
        }

        if (fileParts.length > 6) {
            throwError(400, 'You can upload up to 6 files at once.')
        }

        const names = new Set<string>()

        for (const part of fileParts) {
            if (!part.filename) {
                throwError(400, 'Invalid filename')
            }

            const filename = part.filename

            if (
                filename === '.' ||
                filename === '..' ||
                filename.includes('/') ||
                filename.includes('\\') ||
                filename.includes('\0')
            ) {
                throwError(400, 'Invalid filename.')
            }

            const normalizedName = filename.toLowerCase()

            if (names.has(normalizedName)) {
                throwError(409, `Duplicate file: ${filename}`)
            }

            names.add(normalizedName)

            const existingFile = await prisma.files.findFirst({
                where: {
                    user_id: session.userId,
                    folder_id: null,
                    original_name: {
                        equals: filename
                    }
                }
            })

            if (existingFile) {
                throwError(409, `A file named "${filename}" already exists.`)
            }
        }

        const totalUploadSize = BigInt(
            getTotalUploadSize(fileParts)
        )

        const uploadedFiles = await prisma.$transaction(async (tx) => {
            const user = await tx.users.findUnique({
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
    
            const storageUsed = user.storage_used ?? 0n
            const storageLimit = user.storage_limit ?? 0n
            const remainingStorage = storageLimit - storageUsed
    
            if (totalUploadSize > remainingStorage) {
                throwError(400, 'Not enough storage space.')
            }

            const updated = await tx.users.updateMany({
                where: {
                    id: session.userId,
                    storage_used: user.storage_used
                }, 
                data: {
                    storage_used: storageUsed + totalUploadSize
                }
            })

            if (updated.count !== 1) {
                throwError(409, 'Storage changed. Please try again.')
            }
    
            const uploadedFiles = []
    
            for (const part of fileParts) {
                const { storageKey } = await saveFileToStorage(session.userId, part)

                savedFiles.push(storageKey)
                
                const file = await tx.files.create({
                    data: {
                        user_id: session.userId,
                        folder_id: null,
                        name: part.filename!,
                        original_name: part.filename!,
                        mime_type: part.type ?? null,
                        size: BigInt(part.data.length),
                        storage_key: storageKey
                    }
                })
    
                uploadedFiles.push({
                    ...file,
                    size: Number(file.size)
                })
            }

            return uploadedFiles
        })


        setResponseStatus(event, 201)

        return {
            success: true,
            files: uploadedFiles
        }
    } catch (err: any) {
        if (savedFiles.length) {
            for (const storageKey of savedFiles) {
                try {
                    const storageRoot = path.resolve(
                        process.cwd(),
                        'storage'
                    )

                    const filePath = path.resolve(
                        storageRoot,
                        storageKey
                    )

                    if (
                        filePath !== storageRoot &&
                        filePath.startsWith(storageRoot + path.sep)
                    ) {
                        await unlink(filePath)
                    }
                } catch (cleanupError) {
                    console.error('File cleanup error:', cleanupError)
                }
            }
        }

        if (err.statusCode) throw err

        throwError(500, 'An unknown error occurred while uploading the file.')
    }
})
