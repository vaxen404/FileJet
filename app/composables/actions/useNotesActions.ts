interface NoteData {
    title: string
    content: string
}

export const useNoteActions = () => {
    const activeRequests = ref(0)
    const activeDeletes = ref(0)

    const isLoading = computed(() => activeRequests.value > 0 || isUploading.value)
    const { isUploading, isProcessing, uploadProgress, upload } = useUpload('/api/notes/upload', 'Note')
    const isDeleting = computed(() => activeDeletes.value > 0)

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

    const uploadNote = (file: File | FileList | File[], onSuccess?: () => Promise<void>) => upload(file instanceof File ? [file] : file, onSuccess)

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
        isProcessing,
        isDeleting,
        uploadProgress,
        createNote,
        uploadNote,
        updateNote,
        deleteNote,
        deleteNotes
    }
}
