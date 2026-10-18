import type { TrashItemType, TrashMoveResult } from '~~/shared/types/trash'

export const useTrashActions = () => {
    const router = useRouter()
    const { syncTrash } = useUser()
    const { openToast } = useToast()

    const notifyTrashed = (result: TrashMoveResult, type?: TrashItemType, bulk = false) => {
        if (!result.success || !result.deletedIds.length || !result.trashIds.length) return

        const trashIds = [...new Set(result.trashIds)]
        const label = type ? type[0]!.toUpperCase() + type.slice(1) : 'Item'
        const count = result.deletedIds.length

        openToast(bulk ? `${count} items moved to Trash` : `${label} moved to Trash`, 'success', {
            duration: 8000,
            action: {
                label: 'Undo',
                variant: 'trash-undo',
                run: async () => {
                    if (trashIds.length === 1) {
                        await $fetch(`/api/trash/${encodeURIComponent(trashIds[0]!)}`, {
                            method: 'PATCH'
                        })
                    } else {
                        await $fetch('/api/trash/bulk-restore', {
                            method: 'POST',
                            body: { itemIds: trashIds }
                        })
                    }

                    await syncTrash()

                    const route = router.currentRoute.value

                    if (route.path.startsWith('/folders/') && route.params.folderId) {
                        await refreshNuxtData(`folder-details:${route.params.folderId}`)
                    }

                    openToast(
                        bulk
                            ? `${count} items restored successfully`
                            : `${label} restored successfully`,
                        'success'
                    )
                }
            }
        })
    }

    return { notifyTrashed }
}
