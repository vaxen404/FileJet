import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'
import { join } from 'node:path'
import { unlink } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) throwError(401, 'You need to be logged in.')

        enforceRateLimit(event, `files-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (!body || !Array.isArray(body.fileIds) || !body.fileIds.length || body.fileIds.length > 200) {
            throwError(400, 'Select between 1 and 200 files.')
        }

        if (body.fileIds.some((id: unknown) => typeof id !== 'string' || !isUuid(id))) {
            throwError(400, 'Invalid file ID.')
        }

        const fileIds = [...new Set<string>(body.fileIds.map((id: string) => id.toLowerCase()))]
        const files = await prisma.files.findMany({
            where: { id: { in: fileIds }, user_id: session.userId }
        })

        if (files.length !== fileIds.length) throwError(404, 'One or more selected files could not be found.')

        const deletedIds: string[] = []
        const failedIds: string[] = []

        for (const file of files) {
            try {
                try {
                    await unlink(join(process.cwd(), 'storage', file.storage_key))
                } catch (err: any) {
                    if (err.code !== 'ENOENT') throw err
                }

                await prisma.$transaction([
                    prisma.shared_items.deleteMany({
                        where: { user_id: session.userId, item_id: file.id, item_type: 'file' }
                    }),
                    prisma.files.delete({ where: { id: file.id } }),
                    prisma.users.update({
                        where: { id: session.userId },
                        data: { storage_used: { decrement: file.size } }
                    })
                ])

                deletedIds.push(file.id)
            } catch (err) {
                console.error('Bulk file deletion failed:', file.id, err)
                failedIds.push(file.id)
            }
        }

        return { success: failedIds.length === 0, deletedIds, failedIds }
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(500, 'Selected files could not be deleted.')
    }
})
