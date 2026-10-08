import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-rename:${session.userId}`, 10, 60 * 1000)

        const { fileId, newName } = await readBody(event)

        const cleanName = newName.trim()

        if (!fileId || !cleanName) {
            throwError(400, 'Eksik veri.')
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