import { resolve, sep } from 'node:path'
import { rm } from 'node:fs/promises'
import { prisma } from './prisma'
import { isUuid } from './validation'

export function deletedUserStoragePaths(userId: string, uploadIds: string[]) {
    if (!isUuid(userId) || uploadIds.some(id => !isUuid(id))) throw new Error('Invalid account cleanup path.')
    const root = resolve(process.cwd(), 'storage')
    const staging = resolve(root, '.uploads')
    const owner = resolve(root, userId)
    const uploads = uploadIds.map(id => resolve(staging, id))
    // Validate every absolute target before any recursive removal.
    if (!owner.startsWith(root + sep) || uploads.some(path => !path.startsWith(staging + sep))) throw new Error('Invalid account cleanup path.')
    return [owner, ...uploads]
}

export async function cleanupDeletedUser(userId: string) {
    try {
        return await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT user_id FROM user_deletion_jobs WHERE user_id = ${userId}::uuid FOR UPDATE`
            const job = await tx.user_deletion_jobs.findUnique({ where: { user_id: userId } })
            if (!job) return true
            if (await tx.users.findUnique({ where: { id: userId }, select: { id: true } })) throw new Error('Cannot clean storage for an existing account.')
            for (const path of deletedUserStoragePaths(job.user_id, job.upload_ids)) await rm(path, { recursive: true, force: true })
            await tx.user_deletion_jobs.delete({ where: { user_id: userId } })
            return true
        }, { maxWait: 10000, timeout: 60000 })
    } catch (error) {
        console.error('[DELETED USER STORAGE CLEANUP]', error)
        return false
    }
}

export async function cleanupDeletedUsers() {
    const jobs = await prisma.user_deletion_jobs.findMany({ take: 25, orderBy: { created_at: 'asc' }, select: { user_id: true } })
    for (const job of jobs) await cleanupDeletedUser(job.user_id)
}
