<template>
    <DetailsWorkspace
        v-if="folder"
        v-model="activeTab"
        :title="folder.name"
        :summary="formatFileSize(folder.totalSize)"
        :item-id="folder.id"
        item-type="folder"
        :metadata="metadataRows"
        :share="folder.share"
        :is-favorite="isFavorite"
        :busy="busy"
        @back="goBack"
        @download="downloadFolder(id)"
        @favorite="toggleFavorite"
        @rename="startRename"
        @delete="removeFolder"
        @share-changed="folder.share = $event"
    >
        <div
            class="folder-workspace relative flex-1 flex flex-col min-h-0 min-w-0"
            @dragenter="dragenter"
            @dragover="dragover"
            @dragleave="dragleave"
            @drop="drop"
        >
            <NuxtLink
                v-if="folder.parent"
                class="parent-link flex gap-2 items-center pt-5 pr-5 pb-0 pl-5 text-accent no-underline text-sm
                    leading-[inherit]"
                :to="`/folders/${folder.parent.id}`"
            >
                <Icon name="solar:arrow-left-linear" />
                {{ folder.parent.name }}
            </NuxtLink>
            <FolderBrowser
                :key="id"
                :current-folder-id="id"
                :items="folder.items"
                :favorite-ids="favoriteIds"
                :pending="pending"
                :busy="busy"
                :preview-url="previewUrl"
                @open="openItem"
                @action="itemAction"
                @delete-selected="deleteSelected"
                @moved="refreshContents"
            >
                <template #controls>
                    <UploadButton
                        text="Upload Files"
                        mode="file"
                        :disabled="busy || pending"
                        @files="uploadFilesHere"
                    />
                    <UploadButton
                        text="Upload Folder"
                        mode="folder"
                        :disabled="busy || pending"
                        @folder="uploadFolderHere"
                    />
                </template>
            </FolderBrowser>
            <div
                v-if="isDragging && !busy && !pending"
                class="folder-drop-overlay absolute inset-2 z-20 flex items-center justify-center p-4 text-foreground
                    bg-canvas border-2 border-dashed border-accent rounded-[18px] pointer-events-none"
            >
                <div class="folder-drop-message flex flex-col items-center gap-[0.65rem] max-w-full text-center">
                    <Icon
                        class="max-w-full text-heading-muted text-[0.8125rem] wrap-anywhere first:text-accent first:text-[2.5rem]"
                        name="solar:cloud-upload-bold"
                    />
                    <strong class="text-[0.9375rem] first:text-accent first:text-[2.5rem]">Drop files or folders to upload</strong>
                    <span class="max-w-full text-heading-muted text-[0.8125rem] wrap-anywhere first:text-accent first:text-[2.5rem]">Upload to {{ folder.name }}</span>
                </div>
            </div>
            <UploadProgress
                :active="isUploading || folderActions.isUploading.value"
                :progress="isUploading ? uploadProgress : folderActions.uploadProgress.value"
                :processing="isProcessing || folderActions.uploadProgress.value === 100"
                label="Uploading files and folders..."
            />
        </div>
        <template #edit>
            <form
                class="folder-edit flex flex-col gap-3"
                @submit.prevent="saveRename"
            >
                <label class="text-foreground text-sm leading-[inherit]" for="folder-name">Folder name</label>
                <input class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0
                    focus:outline-none focus:border-accent"
                    id="folder-name"
                    ref="nameInput"
                    v-model="draftName"
                    maxlength="255"
                    required
                    :disabled="busy"
                />
                <span
                    v-if="dirty"
                    class="muted text-muted text-[0.8125rem]"
                >
                    Unsaved changes
                </span>
                <p
                    v-if="saveError"
                    class="error text-danger m-0"
                >
                    {{ saveError }}
                </p>
                <div class="edit-actions flex justify-end flex-wrap gap-3">
                    <button class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                        hover:enabled:bg-divider disabled:opacity-60 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="busy"
                        @click="cancelRename"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="primary text-on-primary bg-primary border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                            border-primary hover:enabled:bg-primary/85 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="busy || !dirty"
                    >
                        {{ isSaving ? 'Saving...' : 'Save' }}
                    </button>
                </div>
            </form>
        </template>
    </DetailsWorkspace>
    <div
        v-else
        class="detail-error p-5 text-content"
    >
        <h1>Unable to load folder</h1>
        <p>The folder could not be found or accessed.</p>
        <button class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
            hover:enabled:bg-divider disabled:opacity-60 disabled:cursor-not-allowed"
            type="button"
            @click="refresh()"
        >
            Try again
        </button>
        <NuxtLink class="text-accent ml-3" :to="returnPage.path">Back to {{ returnPage.name }}</NuxtLink>
    </div>
</template>

<script setup lang="ts">
import type { FolderDetails, LibraryItem } from '~~/shared/types/library'
import { formatFileSize, formatFileTime } from '~/utils/file'
import { getFileReturnPage } from '~/utils/fileNavigation'
import { getDroppedUploadItems } from '~/utils/folderUpload'
import { useFileDrop } from '~/composables/ui/useFileDrop'

definePageMeta({ middleware: 'auth', layout: 'user', key: route => route.path })

const route = useRoute()
const router = useRouter()

const id = route.params.folderId as string

const returnPage = computed(
    () => getFileReturnPage(route.query.from) ?? { path: '/folders', name: 'Folders' }
)

const {
    data: folder,
    pending,
    refresh,
    error: fetchError
} = await useFetch<FolderDetails>(`/api/folders/${encodeURIComponent(id)}`, {
    key: `folder-details:${id}`
})

const fileActions = useFileActions(id)
const { isUploading, isProcessing, uploadProgress } = fileActions
const folderActions = useFolderActions()
const { renameFolder, deleteFolder, downloadFolder } = folderActions
const { deleteNote, deleteNotes } = useNoteActions()
const { notifyTrashed } = useTrashActions()
const { addFavorite, removeFavorite } = useFavoriteActions()
const { folders, favorites, fetchFavorites } = useUser()
const { openToast } = useToast()

await fetchFavorites()

const activeTab = ref<'details' | 'edit' | 'share'>(route.query.tab === 'edit' ? 'edit' : 'details')
const draftName = ref(folder.value?.name ?? '')
const nameInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)
const working = ref(false)
const saveError = ref('')
const dirty = computed(() => !!folder.value && draftName.value !== folder.value.name)

const busy = computed(
    () => isSaving.value || working.value || isUploading.value || folderActions.isLoading.value
)

const favoriteIds = computed(() =>
    favorites.value.flatMap(item =>
        [item.file_id, item.folder_id, item.note_id].filter((value): value is string => !!value)
    )
)

const isFavorite = computed(() => favoriteIds.value.includes(id))

useDetailsHeader(
    'folder',
    id,
    computed(() => folder.value?.name ?? 'Folder'),
    returnPage
)

useUnsavedChanges(dirty, isSaving)

watch(folder, (value, previous) => {
    if (value && !previous) draftName.value = value.name
})

const goBack = () => router.push(returnPage.value.path)

const previewUrl = (item: LibraryItem) => `/api/files/${encodeURIComponent(item.id)}/preview`

const refreshContents = async () => {
    await refresh()

    if (fetchError.value)
        throw new Error(
            'The folder was updated, but its contents could not be refreshed. Try again.'
        )
}

const cancelRename = () => {
    draftName.value = folder.value?.name ?? ''
    saveError.value = ''
    activeTab.value = 'details'
}

const startRename = async () => {
    activeTab.value = 'edit'

    await nextTick()

    nameInput.value?.focus()
    nameInput.value?.select()
}

const saveRename = async () => {
    if (!folder.value || busy.value || !dirty.value) return

    isSaving.value = true
    saveError.value = ''

    try {
        await renameFolder(id, draftName.value)
        await refreshContents()

        draftName.value = folder.value.name

        const listed = folders.value.find(item => item.id === id)

        if (listed) listed.name = folder.value.name

        openToast('Folder renamed successfully.', 'success', { notification: { title: 'Folder renamed', category: 'library', href: '/folders' } })
    } catch (error: any) {
        saveError.value = error.data?.message || error.message || 'Could not rename folder.'

        openToast(saveError.value, 'error')
    } finally {
        isSaving.value = false
    }
}

const toggleFavorite = () =>
    itemAction('favorite', {
        id,
        type: 'folder',
        name: folder.value!.name,
        size: '0',
        created_at: null,
        updated_at: null
    })

const removeFolder = async () => {
    if (busy.value) return

    working.value = true

    try {
        await deleteFolder(id)

        folders.value = folders.value.filter(item => item.id !== id)

        cancelRename()

        await goBack()
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not delete folder.', 'error')
    } finally {
        working.value = false
    }
}

const openItem = (item: LibraryItem, edit = false) => {
    const base = item.type === 'file' ? 'files' : item.type === 'folder' ? 'folders' : 'notes'

    return router.push({
        path: `/${base}/${item.id}`,
        query: { from: route.fullPath, ...(edit ? { tab: 'edit' } : {}) }
    })
}

const deleteItem = async (item: LibraryItem) => {
    if (item.type === 'folder') await deleteFolder(item.id)
    else if (item.type === 'note') await deleteNote(item.id)
    else await fileActions.deleteFile(item.id)
}

const itemAction = async (action: string, item: LibraryItem) => {
    if (busy.value) return

    if (action === 'edit' || (action === 'rename' && item.type === 'note'))
        return openItem(item, true)

    working.value = true

    try {
        if (action === 'download') {
            if (item.type === 'folder') downloadFolder(item.id)
            else if (item.type === 'file') await fileActions.downloadFile(item.id)
            else {
                const link = document.createElement('a')

                link.href = `/api/notes/${encodeURIComponent(item.id)}/download`

                link.download = ''
                link.click()
            }
        } else if (action === 'favorite') {
            if (favoriteIds.value.includes(item.id)) await removeFavorite(item.id, item.type)
            else await addFavorite(item.id, item.type)

            await fetchFavorites()
        } else if (action === 'copy' && item.type === 'file') {
            await fileActions.copyFile({
                id: item.id,
                mime_type: item.mime_type ?? null,
                original_name: item.original_name ?? item.name
            })
        } else if (action === 'delete') {
            await deleteItem(item)

            await refreshContents()

            return
        } else if (action === 'rename') {
            const extension =
                item.type === 'file' ? (item.original_name?.match(/\.[^.]+$/)?.[0] ?? '') : ''

            const currentName =
                extension && item.name.toLowerCase().endsWith(extension.toLowerCase())
                    ? item.name.slice(0, -extension.length)
                    : item.name

            const name = window.prompt(
                item.type === 'file' ? 'New name (the extension is preserved)' : 'New name',
                currentName
            )

            if (name === null || name === currentName) return

            if (item.type === 'folder') await renameFolder(item.id, name)
            else await fileActions.renameFile(item.id, name)

            await refreshContents()
        }

        openToast(
            action === 'copy' ? 'Copied to clipboard.' : 'Action completed successfully.',
            'success'
        )
    } catch (error: any) {
        openToast(
            error.data?.message || error.message || 'The action could not be completed.',
            'error'
        )
    } finally {
        working.value = false
    }
}

const deleteSelected = async (items: LibraryItem[]) => {
    if (busy.value || !items.length) return

    working.value = true

    try {
        const fileIds = items.filter(item => item.type === 'file').map(item => item.id)
        const folderIds = items.filter(item => item.type === 'folder').map(item => item.id)
        const noteIds = items.filter(item => item.type === 'note').map(item => item.id)

        const results = await Promise.allSettled([
            fileActions.deleteFiles(fileIds, { notify: false }),
            folderActions.deleteFolders(folderIds, { notify: false }),
            deleteNotes(noteIds, { notify: false })
        ])

        const successful = results.flatMap(result =>
            result.status === 'fulfilled' ? [result.value] : []
        )

        const deletedIds = successful.flatMap(result => result.deletedIds)
        const trashIds = successful.flatMap(result => result.trashIds)

        notifyTrashed({ success: true, deletedIds, trashIds, failedIds: [] }, undefined, true)

        if (deletedIds.length < items.length) {
            openToast(
                `${items.length - deletedIds.length} items could not be moved to Trash.`,
                'error'
            )
        }

        await refreshContents()
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not refresh folder.', 'error')
    } finally {
        working.value = false
    }
}

const handleDrop = async (event: DragEvent) => {
    if (busy.value || pending.value || !folder.value || !event.dataTransfer) return

    working.value = true

    try {
        const { files, folderFiles } = await getDroppedUploadItems(event.dataTransfer)

        if (!files.length && !folderFiles.length) {
            openToast('The dropped folders contain no files to upload.', 'error')

            return
        }

        const uploads: Array<() => Promise<unknown>> = []
        // The files endpoint accepts up to six files per request.
        for (let index = 0; index < files.length; index += 6) {
            const batch = files.slice(index, index + 6)
            uploads.push(() => fileActions.uploadFiles(batch))
        }

        if (folderFiles.length) {
            uploads.push(() => folderActions.uploadFolders(folderFiles, undefined, id))
        }

        let completed = 0
        const failures: string[] = []

        for (const upload of uploads) {
            try {
                await upload()
                completed++
            } catch (error: any) {
                failures.push(error.data?.message || error.message || 'Upload failed.')
            }
        }

        if (completed) {
            openToast(
                failures.length
                    ? 'Some items were uploaded successfully.'
                    : 'Files and folders uploaded successfully.',
                'success', { notification: { title: 'Upload complete', category: 'upload', href: `/folders/${id}` } }
            )
        }

        for (const message of new Set(failures)) openToast(message, 'error')

        if (completed) await refreshContents()
    } catch (error: any) {
        openToast(
            error.data?.message || error.message || 'Could not read the dropped items.',
            'error'
        )
    } finally {
        working.value = false
    }
}

const { isDragging, dragenter, dragover, dragleave, drop } = useFileDrop(
    event => {
        void handleDrop(event)
    },
    () => Boolean(folder.value)
)

const uploadFilesHere = async (files: FileList) => {
    if (busy.value || pending.value) return

    try {
        await fileActions.uploadFiles(files, refreshContents)

        openToast('Files uploaded successfully.', 'success', { notification: { title: 'Upload complete', category: 'upload', href: '/files' } })
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Upload failed.', 'error')
    }
}

const uploadFolderHere = async (directory: FileSystemDirectoryHandle | FileList) => {
    if (busy.value || pending.value) return

    try {
        await folderActions.uploadFolders(directory, refreshContents, id)

        openToast('Folder uploaded successfully.', 'success', { notification: { title: 'Folder upload complete', category: 'upload', href: '/folders' } })
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Upload failed.', 'error')
    }
}

const metadataRows = computed(() => {
    const item = folder.value

    if (!item) return []

    const sharing = item.share

    return [
        { label: 'Folder name', value: item.name },
        { label: 'Parent folder', value: item.parent?.name ?? 'None' },
        { label: 'Files count', value: item.counts.files },
        { label: 'Subfolders count', value: item.counts.folders },
        { label: 'Notes count', value: item.counts.notes },
        { label: 'Total size', value: formatFileSize(item.totalSize) },
        { label: 'Created date', value: item.created_at ? formatFileTime(item.created_at) : null },
        { label: 'Modified date', value: item.updated_at ? formatFileTime(item.updated_at) : null },
        { label: 'Favorite status', value: isFavorite.value ? 'Favorited' : 'Not favorited' },
        {
            label: 'Share status',
            value: !sharing.url ? 'Not shared' : sharing.isExpired ? 'Expired' : 'Active'
        },
        { label: 'Password protection', value: sharing.hasPassword ? 'Enabled' : 'Disabled' },
        {
            label: 'Link expiration',
            value: sharing.expiresAt ? new Date(sharing.expiresAt).toLocaleString('en-US') : 'Never'
        }
    ]
})
</script>
