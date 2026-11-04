import type { Prisma, notes } from '~~/src/generated/prisma/client'
import { lockStorageUser, reserveStorage } from './storage'
import { throwError } from './error'

export const NOTE_HISTORY_LIMIT = 100
export async function lockVersionedNote(tx: Prisma.TransactionClient, userId: string, id: string, revision?: number) {
    await lockStorageUser(tx, userId)
    const note = await tx.notes.findFirst({ where: { id, user_id: userId } })
    if (!note) throwError(404, 'Note not found.')
    if (revision !== undefined && note.revision !== revision) throwError(409, 'This note changed. Refresh its history before trying again.')
    return note
}
// Caller holds the owner's lock. The snapshot, quota and new revision commit together.
export async function writeNoteVersion(tx: Prisma.TransactionClient, existing: notes, title: string, content: string) {
    if (existing.title === title && existing.content === content) return existing
    const stale = await tx.note_versions.findMany({ where: { user_id: existing.user_id, note_id: existing.id }, orderBy: { revision: 'desc' }, skip: NOTE_HISTORY_LIMIT - 1, select: { id: true, size: true } })
    const size = BigInt(Buffer.byteLength(content, 'utf8'))
    // Existing current bytes become history, so only incoming bytes add storage.
    await reserveStorage(tx, existing.user_id, size - stale.reduce((sum,row) => sum + row.size,0n))
    if (stale.length) await tx.note_versions.deleteMany({ where: { user_id: existing.user_id, id: { in: stale.map(row => row.id) } } })
    await tx.note_versions.create({ data: { user_id: existing.user_id, note_id: existing.id, revision: existing.revision, title: existing.title, content: existing.content, size: existing.size, created_at: existing.updated_at ?? existing.created_at ?? new Date() } })
    return tx.notes.update({ where: { id: existing.id, user_id: existing.user_id }, data: { title, content, size, revision: { increment: 1 }, updated_at: new Date(Math.max(Date.now(), (existing.updated_at?.getTime() ?? 0) + 1)) } })
}
export async function removeNoteVersions(tx: Prisma.TransactionClient, userId: string, noteIds: string[]) {
    if (!noteIds.length) return 0n
    const where = { user_id: userId, note_id: { in: noteIds } }
    const total = await tx.note_versions.aggregate({ where, _sum: { size: true } })
    await tx.note_versions.deleteMany({ where })
    return total._sum.size ?? 0n
}
