
/// <reference lib="dom.asynciterable" />

export const useFolderActions = () => {
    const activeRequests = ref(0)
    const activeUploads = ref(0)
    const activeDeletes = ref(0)

    const uploads = reactive(
        new Map<symbol, { loaded: number; total: number | null }>()
    )

    const isLoading = computed(() => activeRequests.value > 0)
    const isUploading = computed(() => activeUploads.value > 0)
    const isDeleting = computed(() => activeDeletes.value > 0)

    const uploadProgress = computed(() => {
        if (activeUploads.value === 0) return null

        let loaded = 0
        let total = 0

        for (const upload of uploads.values()) {
            if (upload.total === null) return null

            loaded += upload.loaded
            total += upload.total
        }

        return total > 0
            ? Math.round((loaded / total) * 100)
            : null
    })

    const startLoading = () => {
        activeRequests.value++
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
    }

    const getFolderFiles = async (
        directory: FileSystemDirectoryHandle,
        path = directory.name
    ): Promise<File[]> => {
        const files: File[] = []

        for await (const entry of directory.values()) {
            if (entry.kind === 'file') {
                const file = await (entry as FileSystemFileHandle).getFile()

                Object.defineProperty(file, 'webkitRelativePath', {
                    value: `${path}/${file.name}`,
                    configurable: true
                })

                files.push(file)
            } else if (entry.kind === 'directory') {
                const nestedFiles = await getFolderFiles(
                    entry as FileSystemDirectoryHandle,
                    `${path}/${entry.name}`
                )

                files.push(...nestedFiles)
            }
        }

        return files
    }

    const uploadFolders = async (
        input: FileSystemDirectoryHandle | FileList | File[],
        onSuccess?: () => Promise<void>
    ) => {
        const files = typeof FileSystemDirectoryHandle !== 'undefined' && input instanceof FileSystemDirectoryHandle
            ? await getFolderFiles(input)
            : Array.from(input as FileList | File[])

        if (files.length === 0) return

        const uploadId = Symbol()

        uploads.set(uploadId, { loaded: 0, total: null })
        activeUploads.value++
        startLoading()

        try {
            const formData = new FormData()

            Array.from(files).forEach((file) => {
                formData.append('files', file)
                formData.append(
                    'paths',
                    file.webkitRelativePath || file.name
                )
            })

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()

                xhr.open('POST', '/api/folders')
                xhr.responseType = 'json'
                xhr.setRequestHeader('Accept', 'application/json')

                xhr.upload.onprogress = (event) => {
                    uploads.set(uploadId, {
                        loaded: event.loaded,
                        total: event.lengthComputable && event.total > 0
                            ? event.total
                            : null
                    })
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve()
                        return
                    }

                    const response = xhr.response

                    const message =
                        response?.data?.message ||
                        response?.message ||
                        response?.statusMessage ||
                        'Folder upload failed'

                    reject(new Error(String(message)))
                }

                xhr.onerror = () => {
                    reject(new Error('Folder upload failed'))
                }

                xhr.onabort = () => {
                    reject(new Error('Folder upload cancelled'))
                }

                xhr.ontimeout = () => {
                    reject(new Error('Folder upload timed out'))
                }

                xhr.send(formData)
            })

            await onSuccess?.()
        } finally {
            uploads.delete(uploadId)

            activeUploads.value = Math.max(
                0,
                activeUploads.value - 1
            )

            if (activeUploads.value === 0) {
                uploads.clear()
            }

            stopLoading()
        }
    }

    const deleteFolder = async (
        folderId: string,
        onSuccess?: () => Promise<void>
    ) => {
        activeDeletes.value++
        startLoading()

        try {
            await $fetch(`/api/folders/${encodeURIComponent(folderId)}`, {
                method: 'DELETE'
            })

            await onSuccess?.()
        } finally {
            activeDeletes.value = Math.max(
                0,
                activeDeletes.value - 1
            )

            stopLoading()
        }
    }

    const deleteFolders = async (folderIds: string[]) => {
        const uniqueIds = [...new Set(folderIds)]

        if (!uniqueIds.length) {
            return {
                success: true,
                deletedIds: [],
                failedIds: []
            }
        }

        activeDeletes.value++
        startLoading()

        try {
            return await $fetch<{
                success: boolean
                deletedIds: string[]
                failedIds: string[]
            }>('/api/folders/bulk-delete', {
                method: 'POST',
                body: {
                    folderIds: uniqueIds
                }
            })
        } finally {
            activeDeletes.value = Math.max(
                0,
                activeDeletes.value - 1
            )

            stopLoading()
        }
    }

    const renameFolder = async (
        folderId: string,
        newName: string
    ) => {
        startLoading()

        try {
            await $fetch(`/api/folders/${encodeURIComponent(folderId)}`, {
                method: 'PATCH',
                body: {
                    newName
                }
            })
        } finally {
            stopLoading()
        }
    }

    const downloadFolder = (folderId: string) => {
        const link = document.createElement('a')

        link.href = `/api/folders/${encodeURIComponent(folderId)}/download`
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
        uploadFolders,
        deleteFolder,
        deleteFolders,
        renameFolder,
        downloadFolder
    }
}
