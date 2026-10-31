/// <reference lib="dom.asynciterable" />

import { uploadResumably } from '~/utils/resumableUpload'
import type { TrashMoveOptions, TrashMoveResult } from '~~/shared/types/trash'

export const useFolderActions = () => {
    const { syncTrash, user, fetchUser } = useUser()
    const { notifyTrashed } = useTrashActions()
    const activeRequests = ref(0)
    const activeUploads = ref(0)
    const activeDeletes = ref(0)

    const uploads = reactive(new Map<symbol, { loaded: number; total: number | null }>())

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

        return total > 0 ? Math.round((loaded / total) * 100) : null
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
        onSuccess?: () => Promise<void>,
        parentFolderId?: string
    ) => {
        const files =
            typeof FileSystemDirectoryHandle !== 'undefined' &&
            input instanceof FileSystemDirectoryHandle
                ? await getFolderFiles(input)
                : Array.from(input as FileList | File[])

        if (files.length === 0)
            throw new Error('This folder is empty. Use New Folder to create an empty folder.')

        const uploadId = Symbol()

        uploads.set(uploadId, { loaded: 0, total: null })
        activeUploads.value++
        startLoading()

        try {
            if (!user.value) await fetchUser()
            if (!user.value) throw new Error('You need to be logged in.')
            await uploadResumably(files, {
                kind: 'folders', folderId: parentFolderId, scope: user.value.id, label: 'Folder',
                onProgress: (loaded, total) => uploads.set(uploadId, { loaded, total })
            })
            await onSuccess?.()
        } finally {
            uploads.delete(uploadId)

            activeUploads.value = Math.max(0, activeUploads.value - 1)

            if (activeUploads.value === 0) {
                uploads.clear()
            }

            stopLoading()
        }
    }

    const createFolder = async (name: string, parentFolderId?: string) => {
        startLoading()

        try {
            return await $fetch('/api/folders', {
                method: 'POST',
                query: parentFolderId ? { folderId: parentFolderId } : undefined,
                body: { name }
            })
        } finally {
            stopLoading()
        }
    }

    const deleteFolder = async (
        folderId: string,
        onSuccess?: () => Promise<void>,
        options: TrashMoveOptions = {}
    ) => {
        activeDeletes.value++
        startLoading()

        try {
            const result = await $fetch<TrashMoveResult>(
                `/api/folders/${encodeURIComponent(folderId)}`,
                {
                    method: 'DELETE'
                }
            )

            await syncTrash()

            if (options.notify !== false) notifyTrashed(result, 'folder')

            await onSuccess?.()

            return result
        } finally {
            activeDeletes.value = Math.max(0, activeDeletes.value - 1)

            stopLoading()
        }
    }

    const deleteFolders = async (folderIds: string[], options: TrashMoveOptions = {}) => {
        const uniqueIds = [...new Set(folderIds)]

        if (!uniqueIds.length) {
            return {
                success: true,
                deletedIds: [],
                failedIds: [],
                trashIds: []
            }
        }

        activeDeletes.value++
        startLoading()

        try {
            const result = await $fetch<TrashMoveResult>('/api/folders/bulk-delete', {
                method: 'POST',
                body: {
                    ids: uniqueIds
                }
            })

            await syncTrash()

            if (options.notify !== false) notifyTrashed(result, 'folder', true)

            return result
        } finally {
            activeDeletes.value = Math.max(0, activeDeletes.value - 1)

            stopLoading()
        }
    }

    const renameFolder = async (folderId: string, newName: string) => {
        startLoading()

        try {
            return await $fetch(`/api/folders/${encodeURIComponent(folderId)}`, {
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
        createFolder,
        uploadFolders,
        deleteFolder,
        deleteFolders,
        renameFolder,
        downloadFolder
    }
}
