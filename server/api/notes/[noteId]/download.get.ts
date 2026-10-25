import { throwError } from '~~/server/utils/error'
import { prisma } from '../../../utils/prisma'
import { getAuthSession } from '../../../utils/auth'
import { isUuid } from '../../../utils/validation'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    const id = getRouterParam(event, 'noteId')

    if (!id || !isUuid(id)) throwError(400, 'Invalid note ID.')

    const note = await prisma.notes.findFirst({ where: { id, user_id: session.userId } })

    if (!note) throwError(404, 'Note not found.')

    setResponseHeaders(event, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(note.title.replace(/[/\\\0]/g, '_') + '.txt')}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    })

    return note.content
})
