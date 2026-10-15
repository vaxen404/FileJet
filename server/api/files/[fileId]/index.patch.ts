import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-rename:${session.userId}`, 10, 60 * 1000)

        const fileId = getRouterParam(event, 'fileId')

        if (!fileId || !isUuid(fileId)) {
            throwError(400, 'Invalid file ID.')
        }

        const body = await readBody(event)

        if (!body || typeof body !== 'object' || typeof body.newName !== 'string') {
            throwError(400, 'Invalid request body.')
        }

        const { newName } = body

        const cleanName = newName.trim()

        if (!cleanName) {
            throwError(400, 'Eksik veri.')
        }

        if (
            cleanName === '.' ||
            cleanName === '..' ||
            cleanName.includes('/') ||
            cleanName.includes('\\') ||
            cleanName.includes('\0') ||
            newName.length > 255
        ) {
            throwError(400, 'Invalid filename.')
        }
        
        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                user_id: session.userId
            }
        })
        
        if (!file) {
            throwError(404, 'Dosya bulunamadı.')
        }

        
        const extension = file.original_name.includes('.')
        ? '.' + file.original_name.split('.').pop()
        : ''

        const originalName = `${cleanName}${extension}`

        if (originalName.length > 255) {
            throwError(400, 'Invalid filename.')
        }

        const existingFile = await prisma.files.findFirst({
            where: {
                user_id: session.userId,
                folder_id: file.folder_id,
                original_name: originalName,
                id: {
                    not: file.id
                }
            }
        })

        if (existingFile) {
            throwError(409, 'Bu ada sahip dosya zaten var.')
        }

        const updatedFile = await prisma.files.update({
            where: {
                id: file.id
            },
            data: {
                name: newName,
                original_name: originalName
            }
        })

        return {
            success: true,
            file: {
                ...updatedFile,
                size: Number(updatedFile.size)
            }
        }

    } catch (err: any) {
        console.log(err.message);
        if (err.statusCode) throw err

        throwError(500, 'Dosya adı değiştirilirken bilinmeyen bir hata oluştu.')
    }
})
