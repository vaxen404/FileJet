import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { noteSchema } from "~~/shared/schemas/note"
import { getFileParts } from "~~/server/utils/files";

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)
        
        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `notes-upload:${session.userId}`, 10, 60 * 1000)

        const formData = await readMultipartFormData(event) ?? []
        const fileParts = getFileParts(formData)

        if (!fileParts?.length) {
            throwError(400, 'No files uploaded.')
        }

        if (fileParts.length > 10) {
            throwError(400, 'You can upload up to 10 notes at once')
        }

        const maxSize = 5 * 1024 * 1024
        const titles = new Set<string>()
        const notes: {
            user_id: string
            folder_id: string | null
            title: string
            content: string
            size: bigint
        }[] = []

        for (const part of fileParts) {
            if (!part.filename) {
                throwError(400, 'Invalid filename.')
            }
            
            const extension = part.filename.split('.').pop()?.toLowerCase()

            if (!['txt', 'md'].includes(extension ?? '')) {
                throwError(400, 'Only TXT and MD files are supported.')
            }

            const allowedTypes = [
                'text/plain',
                'text/markdown',
                'text/x-markdown',
                'application/octet-stream',
                ''
            ]

            if (!allowedTypes.includes(part.type ?? '')) {
                throwError(400, 'Invalid file type.')
            }

            if (part.data.length > maxSize) {
                throwError(400, 'File size cannot exceed 5 MB.')
            }

            const content = part.data.toString('utf-8')

            if (!Buffer.from(content, 'utf-8').equals(part.data)) {
                throwError(400, 'Invalid UTF-8 file.')
            }

            const title = part.filename.replace(/\.(txt|md)$/i, '').trim()

            const result = noteSchema.safeParse({
                title,
                content
            })

            if (!result.success) {
                throwError(400, result.error.issues[0]?.message ?? 'Invalid note.')
            }

            const normalizedTitle = result.data.title.toLowerCase()

            if (titles.has(normalizedTitle)) {
                throwError(409, `A note named "${result.data.title}" already exists in this upload.`)
            }

            titles.add(normalizedTitle)

            const existing = await prisma.notes.findFirst({
                where: {
                    user_id: session.userId,
                    folder_id: null,
                    title: {
                        equals: result.data.title
                    }
                }
            })

            if (existing) {
                throwError(409, `A note named "${result.data.title}" already exists.`)
            }

            notes.push({
                user_id: session.userId,
                folder_id: null,
                title: result.data.title,
                content: result.data.content,
                size: BigInt(
                    Buffer.byteLength(result.data.content, 'utf-8')
                )
            })
        }

        const uploadedNotes = await prisma.$transaction(async (tx) => {
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

            const totalUploadSize = notes.reduce(
                (total, note) => total + note.size,
                0n
            )
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

            const created = await tx.notes.createManyAndReturn({
                data: notes
            })

            return created.map(note => ({
                ...note, 
                size: note.size.toString()
            }))
        })
        
       return {
        success: true,
        notes: uploadedNotes
       }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Failed to upload note.')
    }
})