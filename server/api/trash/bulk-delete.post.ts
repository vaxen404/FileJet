
import { prisma } from "~~/server/utils/prisma"
import { getAuthSession } from "~~/server/utils/auth"
import { throwError } from "~~/server/utils/error"
import { isUuid } from "~~/server/utils/validation"
import { unlink } from "node:fs/promises"
import path from "node:path"

export default defineEventHandler(async (event) => {
    try {
        const session = getAuthSession(event)

        if (!session) {
            throwError(401, "You need to be logged in.")
        }

        enforceRateLimit(event, `trash-bulk-delete:${session.userId}`, 10, 60 * 1000)

        const body = await readBody(event)

        if (
            !body ||
            !Array.isArray(body.itemIds) ||
            body.itemIds.length === 0 ||
            body.itemIds.length > 50 ||
            !body.itemIds.every((id: unknown) =>
                typeof id === "string" && isUuid(id)
            )
        ) {
            throwError(400, "Invalid item IDs.")
        }

        const itemIds = [...new Set<string>(body.itemIds)]

        const result = await prisma.$transaction(async (tx) => {
            const items = await tx.trash.findMany({
                where: {
                    id: { in: itemIds },
                    user_id: session.userId
                }
            })

            if (items.length !== itemIds.length) {
                throwError(404, "Some items were not found.")
            }

            for (const item of items) {
                if (!["file", "note", "folder"].includes(item.item_type)) {
                    throwError(409, "Invalid trash item type.")
                }
            }

            const allTrashItems = await tx.trash.findMany({
                where: {
                    user_id: session.userId
                }
            })

            const selectedFolderIds = new Set(
                items
                    .filter(item => item.item_type === "folder")
                    .map(item => item.item_id)
            )

            let changed = true

            while (changed) {
                changed = false

                for (const folder of allTrashItems) {
                    if (
                        folder.item_type === "folder" &&
                        folder.parent_folder_id &&
                        selectedFolderIds.has(folder.parent_folder_id) &&
                        !selectedFolderIds.has(folder.item_id)
                    ) {
                        selectedFolderIds.add(folder.item_id)
                        changed = true
                    }
                }
            }

            const deleteItems = new Map(
                items.map(item => [item.id, item])
            )

            for (const item of allTrashItems) {
                if (
                    (
                        item.item_type === "folder" &&
                        selectedFolderIds.has(item.item_id)
                    ) ||
                    (
                        (item.item_type === "file" ||
                            item.item_type === "note") &&
                        item.folder_id !== null &&
                        selectedFolderIds.has(item.folder_id)
                    )
                ) {
                    deleteItems.set(item.id, item)
                }
            }

            const selectedItems = [...deleteItems.values()]

            let totalSize = 0n
            const storageKeys = new Set<string>()

            for (const item of selectedItems) {
                if (!["file", "note", "folder"].includes(item.item_type)) {
                    throwError(409, "Invalid trash item type.")
                }

                if (item.item_type === "folder") continue

                if (item.size === null || item.size < 0n) {
                    throwError(409, "Item size is invalid.")
                }

                totalSize += item.size

                if (item.item_type === "file") {
                    const key = item.storage_key

                    if (
                        !key ||
                        key === "." ||
                        key === ".." ||
                        path.basename(key) !== key ||
                        key.includes("/") ||
                        key.includes("\\") ||
                        key.includes("\0")
                    ) {
                        throwError(409, "Invalid storage key.")
                    }

                    storageKeys.add(key)
                }
            }

            const user = await tx.users.findUnique({
                where: {
                    id: session.userId
                },
                select: {
                    storage_used: true
                }
            })

            if (!user) {
                throwError(404, "User not found.")
            }

            if (
                user.storage_used === null ||
                user.storage_used < totalSize
            ) {
                throwError(409, "Invalid storage usage.")
            }

            if (totalSize > 0n) {
                const updated = await tx.users.updateMany({
                    where: {
                        id: session.userId,
                        storage_used: {
                            gte: totalSize
                        }
                    },
                    data: {
                        storage_used: {
                            decrement: totalSize
                        }
                    }
                })

                if (updated.count !== 1) {
                    throwError(409, "Storage usage has changed.")
                }
            }

            const deleted = await tx.trash.deleteMany({
                where: {
                    user_id: session.userId,
                    id: {
                        in: selectedItems.map(item => item.id)
                    }
                }
            })

            if (deleted.count !== selectedItems.length) {
                throwError(409, "Trash contents have changed.")
            }

            return {
                deletedCount: deleted.count,
                storageKeys: [...storageKeys]
            }
        }, {
            isolationLevel: "Serializable",
            maxWait: 5000,
            timeout: 50000
        })

        let diskDeleted = true

        for (const storageKey of result.storageKeys) {
            const filePath = path.join(
                process.cwd(),
                "storage",
                session.userId,
                storageKey
            )

            try {
                await unlink(filePath)
            } catch (err: any) {
                if (err.code !== "ENOENT") {
                    diskDeleted = false
                    console.error(
                        "Failed to delete file from disk:",
                        filePath,
                        err
                    )
                }
            }
        }

        return {
            success: true,
            deletedCount: result.deletedCount,
            diskDeleted
        }
    } catch (err: any) {
        if (err.statusCode) throw err

        console.error("Bulk trash deletion failed:", err)

        throwError(
            500,
            "An unexpected error occurred while permanently deleting items."
        )
    }
})
