export const useFolderActions = () => {
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

    const uploadFolders = async (
        folder: FileSystemDirectoryHandle,
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

            let fileCount = 0

            const appendDirectory = async (directory: FileSystemDirectoryHandle, path: string): Promise<void> => {
                for await (const entry of directory.values()) {
                    const relativePath = `${path}/${entry.name}`

                    if (entry.kind === 'directory') {
                        await appendDirectory(entry, relativePath)
                    } else {
                        const file = await entry.getFile()
                        formData.append('files', file, file.name)
                        formData.append('paths', relativePath)
                        fileCount++
                    }
                }
            }

            await appendDirectory(folder, folder.name)

            if (!fileCount) throw new Error('The selected folder contains no files.')

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
                        'Folder upload failed'

                    reject(new Error(message))
                }

                xhr.onerror = () => {
                    reject(new Error('Folder upload failed'))
                }

                xhr.onabort = () => {
                    reject(new Error('Folder upload cancelled'))
                }

                xhr.ontimeout = () => {
                    reject(new Error('Folder upload time out'))
                }

                xhr.open('POST', '/api/folders/upload')
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

    const deleteFolder = async (folderId: string, onSuccess?: () => Promise<void>) => {
        activeDeletes.value++
        startLoading()

        try {
            await $fetch('/api/folders/delete', {
                method: 'POST',
                body: {
                    folderId
                }
            })
            await onSuccess?.()
        } finally {
            activeDeletes.value--
            stopLoading()
        }
    }

    return {
        isLoading,
        isUploading,
        isDeleting,
        uploadProgress,
        uploadFolders,
        deleteFolder
    }
}
