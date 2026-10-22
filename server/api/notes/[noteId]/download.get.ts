import { prisma } from '../../../utils/prisma'
import { getAuthSession } from '../../../utils/auth'
import { isUuid } from '../../../utils/validation'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throw createError({ statusCode: 401, message: 'You need to be logged in.' })

    const id = getRouterParam(event, 'noteId')

    if (!id || !isUuid(id)) throw createError({ statusCode: 400, message: 'Invalid note ID.' })

    const note = await prisma.notes.findFirst({ where: { id, user_id: session.userId } })

    if (!note) throw createError({ statusCode: 404, message: 'Note not found.' })

    setResponseHeaders(event, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(note.title.replace(/[/\\\0]/g, '_') + '.txt')}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    })

    return note.content
})
