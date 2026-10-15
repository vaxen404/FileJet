interface NoteData {
    title: string
    content: string
}

export const useNoteActions = () => {
    const activeRequests = ref(0)
    const activeUploads = ref(0)
    const activeDeletes = ref(0)

    const isLoading = computed(() => activeRequests.value > 0)
    const isUploading = computed(() => activeUploads.value > 0)
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
            await $fetch('/api/notes/add', {
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
        file: File,
        onSuccess?: () => Promise<void>
    ) => {
        activeUploads.value++
        startLoading()

        try {
            const formData = new FormData()
            formData.append('file', file)

            await $fetch('/api/notes/upload', {
                method: 'POST',
                body: formData
            })

            await onSuccess?.()
        } finally {
            activeUploads.value = Math.max(0, activeUploads.value - 1)
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
            await $fetch('/api/notes/update', {
                method: 'POST',
                body: {
                    id: noteId,
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
            await $fetch('/api/notes/delete', {
                method: 'POST',
                body: {
                    noteId
                }
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
                deleteIds: [],
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
            }>('/api/notes/delete-bulk', {
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
        createNote,
        uploadNote,
        updateNote,
        deleteNote,
        deleteNotes
    }
}