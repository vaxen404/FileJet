import { readShareBody } from '../../utils/shareBody'
import { parseShareSettings } from '../../utils/shareSettings'
import { assertShareOrigin, shareState } from '../../utils/shares'
import { randomUUID } from "node:crypto";
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { isUuid } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
    try {
        assertShareOrigin(event)
        setHeader(event, 'Cache-Control', 'no-store')
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, 'You need to be logged in.')
        }

        enforceRateLimit(
            event,
            `shared-create:${session.userId}`,
            10,
            60 * 1000
        )

        const body = await readShareBody(event)

        if (!body || typeof body !== 'object') {
            throwError(400, 'Invalid request body.')
        }

        const { itemId, itemType } = body
        
        if (typeof itemId !== 'string' || typeof itemType !== 'string') {
            throwError(400, 'Invalid data.')
        }

        if (!isUuid(itemId)) {
            throwError(400, 'Invalid item ID.')
        }
        
        if (!['file', 'folder', 'note'].includes(itemType)) {
            throwError(400, 'Invalid item type.')
        }

        if (itemType === 'file') {
            const file = await prisma.files.findFirst({
                where: {
                    id: itemId,
                    user_id: session.userId
                }
            })

            if (!file) {
                throwError(404, 'File not found.')
            }
        }

        if (itemType === 'folder') {
            const folder = await prisma.folders.findFirst({
                where: {
                    id: itemId,
                    user_id: session.userId
                }
            })

            if (!folder) {
                throwError(404, 'Folder not found.')
            }
        }

        if (itemType === 'note') {
            const note = await prisma.notes.findFirst({
                where: {
                    id: itemId,
                    user_id: session.userId
                }
            })

            if (!note) {
                throwError(404, 'Note not found.')
            }
        }

        const settings = await parseShareSettings(body)

        const existing = await prisma.shared_items.findFirst({
            where: {
                user_id: session.userId,
                item_id: itemId,
                item_type: itemType
            }
        })

        if (existing) {
            return shareState(event, Object.keys(settings).length ? await prisma.shared_items.update({ where: { id: existing.id }, data: settings }) : existing)
        }

        let retries = 3

        while (retries > 0) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        const existing = await tx.shared_items.findFirst({
                            where: {
                                user_id: session.userId,
                                item_id: itemId,
                                item_type: itemType
                            }
                        })

                        if (existing) {
                            return Object.keys(settings).length ? await tx.shared_items.update({ where: { id: existing.id }, data: settings }) : existing
                        }

                        const shareCount = await tx.shared_items.count({
                            where: {
                                user_id: session.userId
                            }
                        })

                        if (shareCount >= 20) {
                            throwError(
                                429,
                                'You have reached the maximum number of active share links.'
                            )
                        }

                        return await tx.shared_items.create({
                            data: {
                                ...settings,
                                user_id: session.userId,
                                item_id: itemId,
                                item_type: itemType,
                                token: randomUUID()
                            }
                        })
                    },
                    {
                        isolationLevel: 'Serializable'
                    }
                )

                return shareState(event, result)
            } catch (err: any) {
                if (err.statusCode) throw err

                if (err.code === 'P2002') {
                    const existing = await prisma.shared_items.findFirst({
                        where: {
                            user_id: session.userId,
                            item_id: itemId,
                            item_type: itemType
                        }
                    })

                    if (existing) {
                        return shareState(event, Object.keys(settings).length ? await prisma.shared_items.update({ where: { id: existing.id }, data: settings }) : existing)
                    }
                }

                if (err.code === 'P2034') {
                    retries--

                    if (retries > 0) {
                        continue
                    }
                }

                throw err
            }
        }

        throwError(
            500,
            'Could not create the share link.'
        )
    } catch (err: any) {
        if (err.statusCode) throw err

        throwError(
            500,
            'An error occurred while creating the share link.'
        )
    }
})