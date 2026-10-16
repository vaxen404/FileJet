interface NoteData {
    title: string
    content: string
}

export const useNoteActions = () => {
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

        return total > 0 ? Math.min(100, Math.max(0, Math.round((loaded / total) * 100))) : null
    })

    const startLoading = () => {
        activeRequests.value++
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
    }

    const createNote = async (
        data: NoteData,
        onSuccess?: () => Promise<void>
    ) => {
        startLoading()
        
        try {
            await $fetch('/api/notes', {
                method: 'POST',
                body: {
                    title: data.title,
                    content: data.content
                }
            })

            await onSuccess?.()
        } finally {
            stopLoading()
        }
    }

    const uploadNote = async (
        file: File | FileList | File[],
        onSuccess?: () => Promise<void>
    ) => {
        const files = file instanceof File ? [file] : Array.from(file)
        if (!files.length) return

        const uploadId = Symbol()
        if (!activeUploads.value) uploads.clear()

        uploads.set(uploadId, { loaded: 0, total: null })
        activeUploads.value++
        startLoading()

        try {
            const formData = new FormData()
            files.forEach(file => formData.append('files', file))

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
                        'Note upload failed'

                    reject(new Error(message))
                }

                xhr.onerror = () => reject(new Error('Note upload failed'))
                xhr.onabort = () => reject(new Error('Note upload cancelled'))
                xhr.ontimeout = () => reject(new Error('Note upload timed out'))

                xhr.open('POST', '/api/notes/upload')
                xhr.responseType = 'json'
                xhr.setRequestHeader('Accept', 'application/json')
                xhr.send(formData)
            })

            await onSuccess?.()
        } finally {
            uploads.delete(uploadId)
            activeUploads.value = Math.max(0, activeUploads.value - 1)
            if (activeUploads.value === 0) uploads.clear()
            stopLoading()
        }
    }

    const updateNote = async (
        noteId: string,
        data: NoteData,
        onSuccess?: () => Promise<void>
    ) => {
        startLoading()

        try {
            await $fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
                method: 'PATCH',
                body: {
                    title: data.title,
                    content: data.content
                }
            })

            await onSuccess?.()
        } finally {
            stopLoading()
        }
    }

    const deleteNote = async (
        noteId: string,
        onSuccess?: () => Promise<void>
    ) => {
        activeDeletes.value++
        startLoading()

        try {
            await $fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
                method: 'DELETE',
            })

            await onSuccess?.()
        } finally {
            activeDeletes.value = Math.max(0, activeDeletes.value - 1)
            stopLoading()
        }
    }

    const deleteNotes = async (noteIds: string[]) => {
        const uniqueIds = [...new Set(noteIds)]

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
                success: boolean,
                deletedIds: string[],
                failedIds: string[]
            }>('/api/notes/bulk-delete', {
                method: 'POST',
                body: {
                    noteIds: uniqueIds
                }
            })
        } finally {
            activeDeletes.value = Math.max(0, activeDeletes.value - 1)
            stopLoading()
        }
    }

    return {
        isLoading,
        isUploading,
        isDeleting,
        uploadProgress,
        createNote,
        uploadNote,
        updateNote,
        deleteNote,
        deleteNotes
    }
}
