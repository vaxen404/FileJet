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
        if (!session) throwError(401, 'You need to be logged in.')
        enforceRateLimit(event, `files-upload:${session.userId}`, 10, 60 * 1000)
        const parts = getFileParts(await readMultipartFormData(event) ?? [])
        if (!parts.length || parts.length > 6) throwError(400, 'Upload between 1 and 6 files.')
        const names = new Set<string>()
        for (const part of parts) {
            const name = part.filename
            if (name === '.' || name === '..' || /[/\\\0]/.test(name) || name.length > 255) {
                throwError(400, 'Invalid filename.')
            }
            if (names.has(name.toLowerCase())) throwError(409, `Duplicate file: ${name}`)
            names.add(name.toLowerCase())
        }
        // Reject invalid sessions before performing disk work.
        const user = await prisma.users.findUnique({ where: { id: session.userId },
            select: { storage_used: true, storage_limit: true } })
        if (!user) throwError(401, 'Invalid session.')
        if ((user.storage_used ?? 0n) + getTotalUploadSize(parts) > (user.storage_limit ?? 0n)) {
            throwError(400, 'Not enough storage space.')
        }
        batch = await stageUpload(session.userId, parts)
        const keys = batch.keys
        const uploadedFiles = await batch.commit(async tx => {
            await reserveStorage(tx, session.userId, getTotalUploadSize(parts))
            const result = []
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i]!
                const existing = await tx.files.findFirst({ where: {
                    user_id: session.userId, folder_id: null,
                    original_name: { equals: part.filename, mode: 'insensitive' }
                } })
                if (existing) throwError(409, `A file named "${part.filename}" already exists.`)
                const file = await tx.files.create({ data: {
                    user_id: session.userId, folder_id: null,
                    name: part.filename, original_name: part.filename,
                    mime_type: part.type ?? null, size: BigInt(part.data.length), storage_key: keys[i]!
                } })
                result.push({ ...file, size: file.size.toString() })
            }
            return result
        })
        await batch.finish()
        batch = undefined
        setResponseStatus(event, 201)
        return { success: true, files: uploadedFiles }
    } catch (error: any) {
        await batch?.rollback()
        if (error.statusCode) throw error
        console.error('File upload failed:', error)
        throwError(500, 'An unknown error occurred while uploading the file.')
    }
})
