<template>
    <DetailsWorkspace
        v-if="folder"
        v-model="activeTab"
        :title="folder.name"
        :summary="formatFileSize(folder.totalSize)"
        :item-id="folder.id"
        item-type="folder"
        :return-name="returnPage.name"
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
        <div class="folder-workspace">
            <NuxtLink
                v-if="folder.parent"
                class="parent-link"
                :to="`/folders/${folder.parent.id}`"
            >
                <Icon name="solar:arrow-left-linear" />
                {{ folder.parent.name }}
            </NuxtLink>
            <FolderBrowser
                :key="id"
                :items="folder.items"
                :favorite-ids="favoriteIds"
                :pending="pending"
                :busy="busy"
                :preview-url="previewUrl"
                @open="openItem"
                @action="itemAction"
                @delete-selected="deleteSelected"
            >
                <template #controls>
                    <UploadButton
                        text="Upload Files"
                        mode="file"
                        @files="uploadFilesHere"
                    />
                    <UploadButton
                        text="Upload Folder"
                        mode="folder"
                        @folder="uploadFolderHere"
                    />
                </template>
            </FolderBrowser>
            <UploadProgress
                :active="isUploading || folderActions.isUploading.value"
                :progress="isUploading ? uploadProgress : folderActions.uploadProgress.value"
                :processing="isProcessing"
            />
        </div>
        <template #edit>
            <form
                class="folder-edit"
                :aria-busy="isSaving"
                @submit.prevent="saveRename"
            >
                <label for="folder-name">Folder name</label>
                <input
                    id="folder-name"
                    ref="nameInput"
                    v-model="draftName"
                    maxlength="255"
                    required
                    :disabled="busy"
                />
                <span
                    v-if="dirty"
                    class="muted"
                    role="status"
                >
                    Unsaved changes
                </span>
                <p
                    v-if="saveError"
                    class="error"
                    role="alert"
                >
                    {{ saveError }}
                </p>
                <div class="edit-actions">
                    <button
                        type="button"
                        :disabled="busy"
                        @click="cancelRename"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="primary"
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
        class="detail-error"
        role="alert"
    >
        <h1>Unable to load folder</h1>
        <p>The folder could not be found or accessed.</p>
        <button
            type="button"
            @click="refresh()"
        >
            Try again
        </button>
        <NuxtLink :to="returnPage.path">Back to {{ returnPage.name }}</NuxtLink>
    </div>
</template>

<script setup lang="ts">
import type { FolderDetails, LibraryItem } from '~~/shared/types/library'
import { formatFileSize, formatFileTime } from '~/utils/file'
import { getFileReturnPage } from '~/utils/fileNavigation'

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

        openToast('Folder renamed successfully.', 'success')
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

const uploadFilesHere = async (files: FileList) => {
    if (busy.value) return

    try {
        await fileActions.uploadFiles(files, refreshContents)

        openToast('Files uploaded successfully.', 'success')
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Upload failed.', 'error')
    }
}

const uploadFolderHere = async (directory: FileSystemDirectoryHandle) => {
    if (busy.value) return

    try {
        await folderActions.uploadFolders(directory, refreshContents, id)

        openToast('Folder uploaded successfully.', 'success')
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

<style scoped>
.folder-workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
}

.parent-link {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 1.25rem 1.25rem 0;
    color: #8b7cff;
    text-decoration: none;
    font-size: 0.875rem;
}

.folder-edit {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

label {
    color: #ffffff;
    font-size: 0.875rem;
}

input,
button {
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 6px;
    padding: 0.625rem 0.75rem;
    font: inherit;
    box-sizing: border-box;
    min-width: 0;
}

button {
    cursor: pointer;
}

button:hover:not(:disabled) {
    background: #29292e;
}

input:focus {
    outline: none;
    border-color: #5965ed;
}

button.primary {
    color: #ffffff;
    background: #3c47be;
    border-color: #3c47be;
}

button.primary:hover:not(:disabled) {
    background: #4652d1;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.muted {
    color: #898991;
    font-size: 0.8125rem;
}

.error {
    color: #ff6b6b;
    margin: 0;
}

.detail-error {
    padding: 1.25rem;
    color: #d5d5da;
}

.detail-error a {
    color: #8b7cff;
    margin-left: 0.75rem;
}
</style>
