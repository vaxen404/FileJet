import { prisma } from '~~/server/utils/prisma'
import { getAuthSession } from '~~/server/utils/auth'
import { throwError } from '~~/server/utils/error'
import { moveItemsSchema } from '~~/shared/schemas/selection'

export default defineEventHandler(async event => {
    const session = getAuthSession(event)

    if (!session) throwError(401, 'You need to be logged in.')

    enforceRateLimit(event, `items-move:${session.userId}`, 20, 60_000)
    const parsed = moveItemsSchema.safeParse(await readBody(event))

    if (!parsed.success) throwError(400, 'Choose between 1 and 200 items and a valid destination.')

    const { items, destinationId } = parsed.data
    const userId = session.userId

    try {
        return await prisma.$transaction(
            async tx => {
                const ids = (type: 'file' | 'folder' | 'note') =>
                    items.filter(item => item.type === type).map(item => item.id)

                const [allFolders, files, notes] = await Promise.all([
                    tx.folders.findMany({ where: { user_id: userId } }),
                    tx.files.findMany({ where: { user_id: userId, id: { in: ids('file') } } }),
                    tx.notes.findMany({ where: { user_id: userId, id: { in: ids('note') } } })
                ])

                const folderMap = new Map(allFolders.map(folder => [folder.id, folder]))
                const selectedFolderIds = new Set(ids('folder'))
                const chosenFolders = allFolders.filter(folder => selectedFolderIds.has(folder.id))

                if (
                    files.length !== ids('file').length ||
                    notes.length !== ids('note').length ||
                    chosenFolders.length !== selectedFolderIds.size
                ) {
                    throwError(404, 'One or more selected items could not be found.')
                }

                if (destinationId && !folderMap.has(destinationId))
                    throwError(404, 'Destination folder not found.')

                const insideSelection = (parentId: string | null): boolean => {
                    const visited = new Set<string>()

                    while (parentId) {
                        if (visited.has(parentId)) throwError(409, 'Invalid folder hierarchy.')

                        visited.add(parentId)

                        if (selectedFolderIds.has(parentId)) return true

                        const parent = folderMap.get(parentId)

                        if (!parent) throwError(409, 'Invalid folder hierarchy.')

                        parentId = parent.parent_folder_id
                    }

                    return false
                }

                if (insideSelection(destinationId))
                    throwError(
                        400,
                        'A folder cannot be moved into itself or one of its subfolders.'
                    )

                // Descendants already travel with their selected parent; keep their relative locations.
                const movingFolders = chosenFolders.filter(
                    folder =>
                        !insideSelection(folder.parent_folder_id) &&
                        folder.parent_folder_id !== destinationId
                )

                const movingFiles = files.filter(
                    file => !insideSelection(file.folder_id) && file.folder_id !== destinationId
                )

                const movingNotes = notes.filter(
                    note => !insideSelection(note.folder_id) && note.folder_id !== destinationId
                )

                const [targetFiles, targetNotes] = await Promise.all([
                    tx.files.findMany({
                        where: { user_id: userId, folder_id: destinationId },
                        select: { original_name: true }
                    }),
                    tx.notes.findMany({
                        where: { user_id: userId, folder_id: destinationId },
                        select: { title: true }
                    })
                ])

                const checkNames = (existing: string[], incoming: string[], label: string) => {
                    const names = new Set(existing.map(name => name.toLowerCase()))

                    for (const name of incoming) {
                        if (names.has(name.toLowerCase()))
                            throwError(
                                409,
                                `A ${label} named "${name}" already exists in the destination.`
                            )

                        names.add(name.toLowerCase())
                    }
                }

                checkNames(
                    allFolders
                        .filter(folder => folder.parent_folder_id === destinationId)
                        .map(folder => folder.name),
                    movingFolders.map(folder => folder.name),
                    'folder'
                )
                checkNames(
                    targetFiles.map(file => file.original_name),
                    movingFiles.map(file => file.original_name),
                    'file'
                )
                checkNames(
                    targetNotes.map(note => note.title),
                    movingNotes.map(note => note.title),
                    'note'
                )

                const updatedAt = new Date()

                for (const folder of movingFolders) {
                    await tx.folders.update({
                        where: { id: folder.id, user_id: userId },
                        data: { parent_folder_id: destinationId, updated_at: updatedAt }
                    })
                }

                for (const file of movingFiles) {
                    await tx.files.update({
                        where: { id: file.id, user_id: userId },
                        data: { folder_id: destinationId, updated_at: updatedAt }
                    })
                }

                for (const note of movingNotes) {
                    await tx.notes.update({
                        where: { id: note.id, user_id: userId },
                        data: { folder_id: destinationId, updated_at: updatedAt }
                    })
                }

                return {
                    success: true,
                    movedCount: movingFolders.length + movingFiles.length + movingNotes.length
                }
            },
            { isolationLevel: 'Serializable' }
        )
    } catch (error: any) {
        if (error.statusCode) throw error

        if (error.code === 'P2002')
            throwError(409, 'An item with this name already exists in the destination.')

        if (error.code === 'P2034')
            throwError(409, 'The folders changed during the move. Please try again.')

        console.error('[ITEMS MOVE ERROR]', error)
        throwError(500, 'Could not move the selected items.')
    }
})
