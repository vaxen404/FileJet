import { canCopyFile } from '~/utils/file'

export const useFileActions = () => {
    const activeRequests = ref(0)
    const activeDeletes = ref(0)

    const isLoading = computed(() => activeRequests.value > 0 || isUploading.value)
    const { isUploading, isProcessing, uploadProgress, upload } = useUpload('/api/files', 'File')
    const isDeleting = computed(() => activeDeletes.value > 0)

    const startLoading = () => {
        activeRequests.value++
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
    }

    const uploadFiles = (files: FileList | File[], onSuccess?: () => Promise<void>) => upload(files, onSuccess)

    const deleteFile = async (fileId: string, onSuccess?: () => Promise<void>) => {
        activeDeletes.value++
        startLoading()

        try {
            await $fetch(`/api/files/${encodeURIComponent(fileId)}`, {
                method: 'DELETE'
            })

            await onSuccess?.()
        } finally {
            activeDeletes.value--
            stopLoading()
        }
    }

    const deleteFiles = async (fileIds: string[]) => {
        const uniqueIds = [...new Set(fileIds)]

        if (!uniqueIds.length) return { success: true, deletedIds: [], failedIds: [] }

        activeDeletes.value++
        startLoading()

        try {
            return await $fetch<{ success: boolean, deletedIds: string[], failedIds: string[] }>('/api/files/bulk-delete', {
                method: 'POST',
                body: { fileIds: uniqueIds }
            })
        } finally {
            activeDeletes.value--
            stopLoading()
        }
    }

    const renameFile = async (
        fileId: string,
        newName: string
    ) => {
        startLoading()

        try {
            return await $fetch<{
                success: boolean
                file: {
                    id: string
                    user_id: string
                    folder_id: string | null
                    name: string
                    original_name: string
                    mime_type: string | null
                    size: string
                    storage_key: string
                    created_at: string | null
                    updated_at: string | null
                }
            }>(`/api/files/${encodeURIComponent(fileId)}`, {
                method: 'PATCH',
                body: {
                    newName
                }
            })
        } finally {
            stopLoading()
        }
    }

    const copyFile = async (file: { id: string, mime_type: string | null, original_name: string }) => {
        if (!canCopyFile(file.mime_type, file.original_name)) {
            throw new Error('Only text and image files can be copied to the clipboard.')
        }

        if (!import.meta.client || !window.isSecureContext || !navigator.clipboard) {
            throw new Error('Clipboard access requires HTTPS or localhost.')
        }

        const mimeType = file.mime_type!.toLowerCase()

        if (mimeType.startsWith('image/') && (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write)) {
            throw new Error('Your browser does not support copying images to the clipboard.')
        }

        startLoading()

        try {
            const previewUrl = `/api/files/${encodeURIComponent(file.id)}/preview`

            if (mimeType.startsWith('text/') && (typeof ClipboardItem === 'undefined' || !navigator.clipboard.write)) {
                const content = await $fetch<string>(previewUrl, { responseType: 'text' })
                await navigator.clipboard.writeText(content)
                return
            }

            const clipboardType = mimeType.startsWith('text/') ? 'text/plain' : 'image/png'
            const content = $fetch<Blob>(previewUrl, { responseType: 'blob' }).then(async (blob) => {
                if (clipboardType === 'text/plain') {
                    return new Blob([await blob.text()], { type: 'text/plain' })
                }

                if (mimeType === 'image/png') {
                    return new Blob([blob], { type: clipboardType })
                }

                const image = new Image()
                const imageUrl = URL.createObjectURL(blob)

                try {
                    await new Promise<void>((resolve, reject) => {
                        image.onload = () => resolve()
                        image.onerror = () => reject(new Error('Image could not be loaded for copying.'))
                        image.src = imageUrl
                    })

                    const canvas = document.createElement('canvas')
                    canvas.width = image.naturalWidth
                    canvas.height = image.naturalHeight

                    const context = canvas.getContext('2d')

                    if (!context) throw new Error('Image could not be prepared for copying.')

                    context.drawImage(image, 0, 0)

                    return await new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob((png) => {
                            if (png) resolve(png)
                            else reject(new Error('Image could not be prepared for copying.'))
                        }, 'image/png')
                    })
                } finally {
                    URL.revokeObjectURL(imageUrl)
                }
            })

            content.catch(() => {})

            await navigator.clipboard.write([new ClipboardItem({ [clipboardType]: content })])
        } finally {
            stopLoading()
        }
    }

    const downloadFile = async (fileId: string) => {
        const url = `/api/files/${encodeURIComponent(fileId)}/download`
        try {
            await $fetch(url, { method: 'HEAD', retry: 0 })
        } catch (error: any) {
            if ((error?.statusCode ?? error?.status) === 404) {
                throw new Error('File not found in storage. Please upload it again.')
            }
            throw error
        }
        const link = document.createElement('a')

        link.href = url
        link.download = ''

        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    return {
        isLoading,
        isUploading,
        isProcessing,
        isDeleting,
        uploadProgress,
        uploadFiles,
        deleteFile,
        deleteFiles,
        renameFile,
        copyFile,
        downloadFile
    }
}
