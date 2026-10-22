import type { TrashMoveOptions, TrashMoveResult } from '~~/shared/types/trash'

interface NoteData {
    title: string
    content: string
    expectedUpdatedAt?: string | null
}

export const useNoteActions = () => {
    const { syncTrash } = useUser()
    const { notifyTrashed } = useTrashActions()
    const activeRequests = ref(0)
    const activeDeletes = ref(0)

    const isLoading = computed(() => activeRequests.value > 0 || isUploading.value)

    const { isUploading, isProcessing, uploadProgress, upload } = useUpload(
        '/api/notes/upload',
        'Note'
    )

    const isDeleting = computed(() => activeDeletes.value > 0)

    const startLoading = () => {
        activeRequests.value++
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
    }

    const createNote = async (data: NoteData, onSuccess?: () => Promise<void>) => {
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

    const uploadNote = (file: File | FileList | File[], onSuccess?: () => Promise<void>) =>
        upload(file instanceof File ? [file] : file, onSuccess)

    const updateNote = async (noteId: string, data: NoteData, onSuccess?: () => Promise<void>) => {
        startLoading()

        try {
            const response = await $fetch<{
                success: boolean
                note: Omit<import('~~/shared/types/library').NoteDetails, 'folder' | 'share'>
            }>(`/api/notes/${encodeURIComponent(noteId)}`, {
                method: 'PATCH',
                body: {
                    title: data.title,
                    content: data.content,
                    ...(data.expectedUpdatedAt !== undefined
                        ? { expectedUpdatedAt: data.expectedUpdatedAt }
                        : {})
                }
            })

            await onSuccess?.()

            return response
        } finally {
            stopLoading()
        }
    }

    const deleteNote = async (
        noteId: string,
        onSuccess?: () => Promise<void>,
        options: TrashMoveOptions = {}
    ) => {
        activeDeletes.value++
        startLoading()

        try {
            const result = await $fetch<TrashMoveResult>(
                `/api/notes/${encodeURIComponent(noteId)}`,
                {
                    method: 'DELETE'
                }
            )

            await syncTrash()

            if (options.notify !== false) notifyTrashed(result, 'note')

            await onSuccess?.()

            return result
        } finally {
            activeDeletes.value = Math.max(0, activeDeletes.value - 1)
            stopLoading()
        }
    }

    const deleteNotes = async (noteIds: string[], options: TrashMoveOptions = {}) => {
        const uniqueIds = [...new Set(noteIds)]

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
            const result = await $fetch<TrashMoveResult>('/api/notes/bulk-delete', {
                method: 'POST',
                body: {
                    ids: uniqueIds
                }
            })

            await syncTrash()

            if (options.notify !== false) notifyTrashed(result, 'note', true)

            return result
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
