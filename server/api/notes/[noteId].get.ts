import { prisma } from '../../utils/prisma'
import { getAuthSession } from '../../utils/auth'
import { isUuid } from '../../utils/validation'
import { shareState } from '../../utils/shares'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throw createError({ statusCode: 401, message: 'You need to be logged in.' })

    const id = getRouterParam(event, 'noteId')

    if (!id || !isUuid(id)) throw createError({ statusCode: 400, message: 'Invalid note ID.' })

    const note = await prisma.notes.findFirst({ where: { id, user_id: session.userId } })

    if (!note) throw createError({ statusCode: 404, message: 'Note not found.' })

    const [folder, share] = await Promise.all([
        note.folder_id
            ? prisma.folders.findFirst({
                  where: { id: note.folder_id, user_id: session.userId },
                  select: { id: true, name: true }
              })
            : null,
        prisma.shared_items.findFirst({
            where: { user_id: session.userId, item_id: id, item_type: 'note' }
        })
    ])

    setHeader(event, 'Cache-Control', 'no-store')

    return { ...note, size: note.size.toString(), folder, share: shareState(event, share) }
})
