import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { getFileParts, getTotalUploadSize, saveFileToStorage } from "~~/server/utils/files";

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'Oturum açmanız gerek.')
        }

        enforceRateLimit(event, `files-upload:${session.userId}`, 10, 60 * 1000 )

        const formData = await readMultipartFormData(event) ?? []

        if (!formData || !formData.length) {
            throwError(400, 'Dosya bulunamadı.')
        }

        const fileParts = getFileParts(formData)

        if (!fileParts.length) {
            throwError(400, 'Geçerli bir dosya bulunamadı.')
        }

        if (fileParts.length > 6) {
            throwError(400, 'Aynı anda en fazla 6 dosya yükleyebilirsiniz.')
        }

        for (const part of fileParts) {
            const existingFile = await prisma.files.findFirst({
                where: {
                    user_id: session.userId,
                    folder_id: null,
                    original_name: part.filename
                }
            })

            if (existingFile) {
                throwError(409, `${part.filename} adlı dosya zaten var.`)
            }
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
            throwError(401, 'Geçersiz oturum.')
        }

        const totalUploadSize = getTotalUploadSize(fileParts)

        const storageUsed = Number(user.storage_used ?? 0 )
        const storageLimit = Number(user.storage_limit ?? 0 )
        const remainingStorage = storageLimit - storageUsed

        if (totalUploadSize > remainingStorage) {
            throwError(400, 'Yeterli depolama alanınız yok.')
        }

        const uploadedFiles = []

        for (const part of fileParts) {
            const { safeName, storageKey } = await saveFileToStorage(session.userId, part)
            
            const file = await prisma.files.create({
                data: {
                    user_id: session.userId,
                    folder_id: null,
                    name: part.filename,
                    original_name: part.filename,
                    mime_type: part.type ?? null,
                    size: Number(part.data.length),
                    storage_key: storageKey
                }
            })

            uploadedFiles.push({
                ...file,
                size: Number(file.size)
            })
        }

        await prisma.users.update({
            where: {
                id: session.userId
            },
            data: {
                storage_used: {
                    increment: BigInt(totalUploadSize)
                }
            }
        })

        return {
            files: uploadedFiles
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Dosya yüklenirken bilinmeyen bir hata oluştu!')
    }
})