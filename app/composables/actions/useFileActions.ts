
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

        let uploaded = false

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

            uploaded = true
            await onSuccess?.()
        } finally {
            if (!uploaded) uploads.delete(uploadId)

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
        renameFile,
        downloadFile
    }
}
