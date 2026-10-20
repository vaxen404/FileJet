import type { SelectionItem } from '~~/shared/schemas/selection'

export const useItemActions = () => {
    const isMoving = ref(false)
    const isDownloading = ref(false)

    const moveItems = async (items: SelectionItem[], destinationId: string | null) => {
        if (isMoving.value) return
        isMoving.value = true
        try {
            return await $fetch('/api/items/move', { method: 'POST', body: { items, destinationId } })
        } finally {
            isMoving.value = false
        }
    }

    const downloadItems = async (items: SelectionItem[]) => {
        if (isDownloading.value || !items.length) return
        isDownloading.value = true
        try {
            const data = await $fetch<Blob>('/api/items/download', { method: 'POST', body: { items }, responseType: 'blob' })
            const url = URL.createObjectURL(data)
            try {
                const link = document.createElement('a')
                link.href = url
                link.download = 'FileJet-selection.zip'
                document.body.appendChild(link)
                link.click()
                link.remove()
            } finally {
                setTimeout(() => URL.revokeObjectURL(url), 1000)
            }
        } catch (error: any) {
            if (error.data instanceof Blob) {
                let message = 'Could not download the selected items.'
                try {
                    const body = JSON.parse(await error.data.text())
                    if (typeof body.message === 'string') message = body.message
                } catch { /* Keep the download error readable when the response is not JSON. */ }
                throw new Error(message)
            }
            throw error
        } finally {
            isDownloading.value = false
        }
    }

    return { isMoving, isDownloading, moveItems, downloadItems }
}
