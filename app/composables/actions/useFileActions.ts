 { }
import { canCopyFile } from '~/utils/file'

export const useFileActions = () => {
    const activeRequests = ref(0)
    const activeUploads = ref(0)
    const activeDeletes = ref(0)
    const uploads = reactive(new Map<symbol, { loaded: number, total: number | null }>())

    const isLoading = computed(() => activeRequests.value > 0)
    const isUploading = computed(() => activeUploads.value > 0)
    const isDeleting = computed(() => activeDeletes.value > 0)
    const uploadProgress = computed(() => {
        let loaded = 0
        let total = 0

        for (const upload of uploads.values()) {
            if (upload.total === null) return null

            loaded += upload.loaded
            total += upload.total
        }

        return total > 0 ? Math.round((loaded / total) * 100) : null
    })

    const startLoading = () => {
        activeRequests.value++
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
    }

    const uploadFiles = async (
        files: FileList | File[],
        onSuccess?: () => Promise<void>
    ) => {
        const uploadId = Symbol()

        if (!activeUploads.value) uploads.clear()

        uploads.set(uploadId, { loaded: 0, total: null })
        activeUploads.value++
        startLoading()

        try {
            const formData = new FormData()

            Array.from(files).forEach((file) => {
                formData.append('files', file)
            })

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()

                xhr.upload.onprogress = (event) => {
                    uploads.set(uploadId, {
                        loaded: event.loaded,
                        total: event.lengthComputable && event.total > 0 ? event.total : null
                    })
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve()
                        return
                    }

                    const message =
                        xhr.response?.message ||
                        xhr.response?.data?.message ||
                        xhr.response?.statusMessage ||
                        'File upload failed'

                    reject(new Error(message))
                }

                xhr.onerror = () => {
                    reject(new Error('File upload failed'))
                }

                xhr.onabort = () => {
                    reject(new Error('File upload cancelled'))
                }

                xhr.ontimeout = () => {
                    reject(new Error('File upload timed out'))
                }

                xhr.open('POST', '/api/files/add')
                xhr.responseType = 'json'
                xhr.setRequestHeader('Accept', 'application/json')
                xhr.send(formData)
            })

            await onSuccess?.()
        } finally {
            activeUploads.value--
            if (!activeUploads.value) uploads.clear()
            stopLoading()
        }
    }

    const deleteFile = async (fileId: string, onSuccess?: () => Promise<void>) => {
        activeDeletes.value++
        startLoading()

        try {
            await $fetch('/api/files/delete', {
                method: 'POST',
                body: {
                    fileId
                }
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
            return await $fetch<{ success: boolean, deletedIds: string[], failedIds: string[] }>('/api/files/delete-bulk', {
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
            await $fetch('/api/files/rename', {
                method: 'POST',
                body: {
                    fileId,
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
            const previewUrl = `/api/files/preview?fileId=${encodeURIComponent(file.id)}`

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

    const downloadFile = (fileId: string) => {
        const link = document.createElement('a')

        link.href = `/api/files/download?fileId=${encodeURIComponent(fileId)}`
        link.download = ''

        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    return {
        isLoading,
        isUploading,
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
