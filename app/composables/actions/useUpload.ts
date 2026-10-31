import { uploadResumably } from '~/utils/resumableUpload'
export const useUpload = (url: string, label: string) => {
    const currentUser = useAuthUser()
    const uploads = reactive(
        new Map<symbol, { loaded: number; total: number | null; transferred: boolean }>()
    )

    const isUploading = computed(() => uploads.size > 0)

    const isProcessing = computed(
        () => uploads.size > 0 && [...uploads.values()].every(upload => upload.transferred)
    )

    const uploadProgress = computed(() => {
        if (isProcessing.value) return 100

        let loaded = 0
        let total = 0

        for (const upload of uploads.values()) {
            if (upload.total === null) return null

            loaded += upload.loaded
            total += upload.total
        }

        return total > 0 ? Math.min(99, Math.max(0, Math.floor((loaded / total) * 100))) : null
    })

    const upload = async (files: FileList | File[], onSuccess?: () => Promise<void>, options?: { folderId?: string }) => {
        if (!files.length) return

        const id = Symbol()
        uploads.set(id, { loaded: 0, total: null, transferred: false })

        try {
            const endpoint = new URL(url, window.location.origin)
            const total = Array.from(files).reduce((sum, file) => sum + file.size, 0)
            uploads.set(id, { loaded: 0, total, transferred: false })
            if (!currentUser.value) throw new Error('You need to be logged in.')
            await uploadResumably(Array.from(files), {
                kind: endpoint.pathname === '/api/notes/upload' ? 'notes' : endpoint.pathname === '/api/folders' ? 'folders' : 'files',
                folderId: options?.folderId ?? endpoint.searchParams.get('folderId'), scope: currentUser.value.id, label,
                onProgress: (loaded, total, transferred) => uploads.set(id, { loaded, total, transferred })
            })
            await onSuccess?.()
        } finally {
            uploads.delete(id)
        }
    }

    return { isUploading, isProcessing, uploadProgress, upload }
}
