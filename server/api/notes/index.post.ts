import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { noteSchema } from "~~/shared/schemas/note"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(event, `notes-add:${session.userId}`, 10, 60 * 1000 )

        const body = await readBody(event)
        const result = noteSchema.safeParse(body)

        if (!result.success) {
            throwError(400, result.error.issues[0]?.message ?? 'Invalid data.')
        }

        const { title, content } = result.data

        const size = BigInt(
            Buffer.byteLength(content, 'utf-8')
        )

        const addNote = await prisma.$transaction(async (tx) => {
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
    
            const storageUsed = user?.storage_used ?? 0n
            const storageLimit = user?.storage_limit ?? 0n
            const remainingStore = storageLimit - storageUsed
    
            if (size > remainingStore) {
                throwError(400, 'Not enough storage space.')
            }

            const existing = await tx.notes.findFirst({
                where: {
                    user_id: session.userId,
                    folder_id: null,
                    title: {
                        equals: title,
                    }
                }
            })

            if (existing) {
                throwError(409, `A note named "${title}" already exists`)
            }

            const updated = await tx.users.updateMany({
                where: {
                    id: session.userId,
                    storage_used: user?.storage_used
                },
                data: {
                    storage_used: storageUsed + size
                }
            })

            if (updated.count !== 1) {
                throwError(409, 'Storage changed. Please try again.')
            }

            const note = await tx.notes.create({
                data: {
                    user_id: session.userId,
                    title,
                    content,
                    size
                }
            })

            return note
        })


        return {
            success: true,
            note: {
                ...addNote,
                size: addNote.size.toString()
            }
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        console.log('Note creation error:', err)

        throwError(500, 'Failed to create note.')
    }
})
