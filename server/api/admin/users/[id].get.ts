import { Prisma } from '~~/src/generated/prisma/client'
import { prisma } from '../../../utils/prisma'
import { requireAdmin, adminUserSelect, adminUserView } from '../../../utils/admin'
import { isUuid } from '../../../utils/validation'
import { throwError } from '../../../utils/error'
import { summarizeStorageUsage } from '../../../utils/storageUsage'

export default defineEventHandler(async event => {
    await requireAdmin(event)
    setHeader(event, 'Cache-Control', 'private, no-store')
    const id = getRouterParam(event, 'id')
    if (!id || !isUuid(id)) throwError(400, 'Invalid user ID.')
    return prisma.$transaction(async tx => {
        const user = await tx.users.findUnique({ where: { id }, select: adminUserSelect })
        if (!user) throwError(404, 'User not found.')
        const where = { user_id: id }
        const [files, notes, folders, favorites, shares, inboxes, trashCount, versions, pending, uploads,
            fileGroups, trashGroups, versionGroups, pendingGroups, recentFiles, recentNotes, noteVersions] = await Promise.all([
            tx.files.aggregate({ where, _count: true, _sum: { size: true } }),
            tx.notes.aggregate({ where, _count: true, _sum: { size: true } }),
            tx.folders.count({ where }), tx.favorites.count({ where }),
            tx.shared_items.findMany({ where, select: { expires_at: true, max_downloads: true, download_count: true } }),
            tx.file_requests.count({ where }), tx.trash.count({ where }),
            tx.file_versions.aggregate({ where, _count: true, _sum: { size: true } }),
            tx.request_uploads.aggregate({ where: { status: 'pending', request: where }, _count: true, _sum: { size: true } }),
            tx.upload_sessions.aggregate({ where: { ...where, result: { equals: Prisma.DbNull }, expires_at: { gt: new Date() } }, _count: true, _sum: { total_size: true } }),
            tx.files.groupBy({ by: ['mime_type'], where, _sum: { size: true } }),
            tx.trash.groupBy({ by: ['item_type', 'mime_type'], where: { ...where, item_type: { in: ['file', 'note'] } }, _sum: { size: true } }),
            tx.file_versions.groupBy({ by: ['mime_type'], where, _sum: { size: true } }),
            tx.request_uploads.groupBy({ by: ['mime_type'], where: { status: 'pending', request: where }, _sum: { size: true } }),
            tx.files.findMany({ where, orderBy: { updated_at: 'desc' }, take: 5, select: { id: true, original_name: true, size: true, created_at: true, updated_at: true } }),
            tx.notes.findMany({ where, orderBy: { updated_at: 'desc' }, take: 5, select: { id: true, title: true, size: true, created_at: true, updated_at: true } }),
            tx.note_versions.aggregate({where,_count:true,_sum:{size:true}})
        ])
        const storage = summarizeStorageUsage({ limit: user.storage_limit, files: fileGroups, notes: (notes._sum.size??0n)+(noteVersions._sum.size??0n), trash: trashGroups, versions: versionGroups, pending: pendingGroups })
        const recent = [
            ...recentFiles.map(file => ({ id: file.id, type: 'file' as const, name: file.original_name, size: file.size.toString(), updatedAt: (file.updated_at ?? file.created_at)?.toISOString() ?? null })),
            ...recentNotes.map(note => ({ id: note.id, type: 'note' as const, name: note.title, size: note.size.toString(), updatedAt: (note.updated_at ?? note.created_at)?.toISOString() ?? null }))
        ].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        const activeShares = shares.filter(share => (!share.expires_at || share.expires_at.getTime() > Date.now()) && (share.max_downloads == null || share.download_count < share.max_downloads)).length
        return {
            user: adminUserView(user), storage,
            counts: { files: files._count, folders, notes: notes._count, favorites, shares: shares.length, activeShares, inboxes, trash: trashCount, versions: versions._count+noteVersions._count, pendingFiles: pending._count, unfinishedUploads: uploads._count },
            bytes: { files: (files._sum.size ?? 0n).toString(), notes: (notes._sum.size ?? 0n).toString(), versions: ((versions._sum.size??0n)+(noteVersions._sum.size??0n)).toString(), pending: (pending._sum.size ?? 0n).toString(), unfinished: (uploads._sum.total_size ?? 0n).toString() },
            recent
        }
    }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
})
