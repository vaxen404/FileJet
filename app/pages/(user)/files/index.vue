<template>
    <div class="files-page">
        <div class="files-header">
            <div class="files-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search files..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton
                        text="Upload"
                        mode="file"
                        @files="handleFiles"
                    />
                </div>
            </div>

            <div class="files-subtoolbar">
                <ItemFilters
                    v-model="activeCategory"
                    :options="filterOptions"
                />

                <SortDropdown v-model="sortMode" />
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-loading="isInitialLoading"
            drop-text="Drop files to upload"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="loading-state">Loading files...</div>
            </template>
            <template
                v-if="!isInitialLoading && filteredFiles.length === 0"
                #empty
            >
                <div class="empty-state">
                    <Icon
                        name="solar:file-bold"
                        size="2.5rem"
                        class="empty-state-icon"
                    />
                    <strong>{{
                        error
                            ? 'Unable to load files'
                            : files.length
                              ? 'No matching files'
                              : 'No files yet'
                    }}</strong>
                    <span class="empty-state-description">{{
                        error ||
                        (files.length
                            ? 'Try a different search or filter.'
                            : 'Upload your first file to get started.')
                    }}</span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll">
                    <table class="files-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        class="file-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="isLoading || isBulkDeleting"
                                        @change="toggleSelectAll"
                                    />
                                </th>

                                <th>
                                    <div class="name-header">
                                        Name
                                        <Icon
                                            name="solar:sort-vertical-linear"
                                            class="sort-icon"
                                        />
                                    </div>
                                </th>

                                <th>Type</th>
                                <th>Size</th>
                                <th>Modified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="file in paginatedFiles"
                                :key="file.id"
                                :class="{ selected: selectedFiles.includes(file.id) }"
                                @click="openFile(file)"
                                @contextmenu.prevent.stop="openContextMenu($event, file.id)"
                            >
                                <td @click.stop>
                                    <input
                                        v-model="selectedFiles"
                                        type="checkbox"
                                        class="file-checkbox"
                                        :value="file.id"
                                        :disabled="isLoading || isBulkDeleting"
                                    />
                                </td>

                                <td>
                                    <div class="file-name">
                                        <div class="file-icon">
                                            <Icon
                                                :name="
                                                    getFileIcon(file.mime_type, file.original_name)
                                                "
                                            />
                                        </div>

                                        <div class="file-info">
                                            <input
                                                type="text"
                                                class="name-input"
                                                :data-file-id="file.id"
                                                :class="{ active: editingFileId === file.id }"
                                                :value="
                                                    editingFileId === file.id
                                                        ? editingFileName
                                                        : file.name
                                                "
                                                :disabled="editingFileId !== file.id"
                                                @input="
                                                    editingFileName = (
                                                        $event.target as HTMLInputElement
                                                    ).value
                                                "
                                                @keyup.enter="saveRename(file)"
                                                @blur="
                                                    editingFileId === file.id && saveRename(file)
                                                "
                                                @click.stop
                                            />
                                            <span>
                                                {{ formatFileSize(file.size) }} •
                                                {{ formatFileTime(file.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>{{ getFileType(file.original_name) }}</td>
                                <td>{{ formatFileSize(file.size) }}</td>
                                <td>{{ formatFileTime(file.updated_at) }}</td>

                                <td @click.stop>
                                    <ItemMenu
                                        :ref="menu => setFileMenuRef(file.id, menu)"
                                        type="file"
                                        :is-favorite="isFileFavorite(file.id)"
                                        :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                        @open="openFile(file)"
                                        @download="handleDownload(file.id)"
                                        @rename="startRename(file)"
                                        @copy="handleCopy(file.id)"
                                        @favorite="handleFavorite(file)"
                                        @delete="handleDelete(file.id)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #grid>
                <ItemGrid>
                    <ItemGridCard
                        v-for="file in paginatedFiles"
                        :key="file.id"
                        :selected="selectedFiles.includes(file.id)"
                        :title="file.name"
                        :icon="getFileIcon(file.mime_type, file.original_name)"
                        @click="openFile(file)"
                        @contextmenu.prevent.stop="openContextMenu($event, file.id)"
                    >
                        <template
                            v-if="
                                file.mime_type?.startsWith('image/') ||
                                file.mime_type?.startsWith('video/')
                            "
                            #preview
                        >
                            <div
                                v-if="file.mime_type?.startsWith('video/')"
                                class="video-play-icon"
                            >
                                <Icon name="solar:play-bold" />
                            </div>
                            <img
                                v-if="file.mime_type?.startsWith('image/')"
                                :src="`/api/files/${file.id}/preview`"
                                :alt="file.name"
                                loading="lazy"
                                class="file-preview-image"
                            />
                            <video
                                v-else
                                :src="`/api/files/${file.id}/preview`"
                                class="file-preview-image"
                                preload="metadata"
                                muted
                                playsinline
                            />
                        </template>
                        <template #actions>
                            <label class="file-select">
                                <input
                                    class="file-checkbox"
                                    v-model="selectedFiles"
                                    type="checkbox"
                                    :value="file.id"
                                    :disabled="isLoading || isBulkDeleting"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setFileMenuRef(file.id, menu)"
                                type="file"
                                :is-favorite="isFileFavorite(file.id)"
                                :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                @open="openFile(file)"
                                @download="handleDownload(file.id)"
                                @rename="startRename(file)"
                                @copy="handleCopy(file.id)"
                                @favorite="handleFavorite(file)"
                                @delete="handleDelete(file.id)"
                            />
                        </template>
                        <template #title>
                            <input
                                type="text"
                                class="file-name-input"
                                :data-file-id="file.id"
                                :class="{ active: editingFileId === file.id }"
                                :value="editingFileId === file.id ? editingFileName : file.name"
                                :disabled="editingFileId !== file.id"
                                @input="editingFileName = ($event.target as HTMLInputElement).value"
                                @keyup.enter="saveRename(file)"
                                @blur="editingFileId === file.id && saveRename(file)"
                                @click.stop
                            />
                        </template>
                        <template #metadata>
                            <span>{{ formatFileSize(file.size) }}</span>
                            ·
                            <span>{{ formatFileTime(file.created_at) }}</span>
                        </template>
                    </ItemGridCard>
                </ItemGrid>
            </template>
        </DataView>
        <UploadProgress
            :active="isUploading"
            :progress="uploadProgress"
            :processing="isProcessing"
        />

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="viewMode"
        />
        <SelectionToolbar
            :items="selectionItems"
            :busy="pending || isLoading || isBulkDeleting"
            :current-folder-id="null"
            @clear="selectedFiles = []"
            @delete="handleDeleteSelected"
            @moved="handleSelectionMoved"
        />
    </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'
import {
    canCopyFile,
    getFileIcon,
    getFileType,
    getFileCategory,
    formatFileSize,
    formatFileTime
} from '~/utils/file'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()

const {
    isLoading,
    isUploading,
    isProcessing,
    uploadProgress,
    uploadFiles,
    deleteFile,
    deleteFiles,
    renameFile,
    copyFile,
    downloadFile
} = useFileActions()

const { addFavorite, removeFavorite } = useFavoriteActions()

const { files, favorites, pending, error, fetchAll } = useUser()

const isInitialLoading = computed(
    () => pending.value && files.value.length === 0 && !isUploading.value
)

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const activeCategory = ref('All')
const filterOptions = ['All', 'Images', 'Documents', 'Videos', 'Compressed', 'Others']

const fileMenus = new Map<string, InstanceType<typeof ItemMenu>>()

const setFileMenuRef = (fileId: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) fileMenus.set(fileId, menu as InstanceType<typeof ItemMenu>)
    else fileMenus.delete(fileId)
}

const openContextMenu = (event: MouseEvent, fileId: string) => {
    fileMenus.get(fileId)?.openAt(event.clientX, event.clientY)
}

const editingFileId = ref<string | null>(null)
const editingFileName = ref('')

const startRename = async (file: any) => {
    editingFileId.value = file.id
    editingFileName.value = file.name

    await nextTick()

    const input = document.querySelector(`[data-file-id="${file.id}"]`) as HTMLInputElement | null

    input?.focus()
    input?.select()
}

const handleDrop = (event: DragEvent) => {
    const droppedFiles = event.dataTransfer?.files

    if (droppedFiles?.length) return handleFiles(droppedFiles)
}

const filteredFiles = computed(() => {
    return files.value.filter(file => {
        const matchesCategory =
            activeCategory.value === 'All' ||
            getFileCategory(file.original_name) === activeCategory.value

        const matchesSearch = file.name.toLowerCase().includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const { sortedItems: sortedFiles } = useSort(
    filteredFiles,
    sortMode,
    file => file.name,
    file => file.created_at
)

const handleFiles = async (files: FileList) => {
    if (!files.length) {
        openToast('Please select a file', 'error')

        return
    }

    try {
        await uploadFiles(files, async () => {
            await fetchAll()

            if (error.value) throw new Error(error.value)
        })

        openToast('File uploaded successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File upload failed.', 'error')
    }
}

const openFile = (file: any) => {
    navigateTo(`/files/${file.id}`)
}

const saveRename = async (file: any) => {
    const newName = editingFileName.value?.trim()

    if (!newName || newName === file.name) {
        editingFileId.value = null

        return
    }

    try {
        await renameFile(file.id, newName)
        await fetchAll()

        editingFileId.value = null

        openToast('File renamed successfully', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be renamed.', 'error')
    }
}

const handleCopy = async (fileId: string) => {
    try {
        const file = files.value.find(file => file.id === fileId)

        if (!file) throw new Error('File not found.')

        await copyFile(file)
        openToast('Copied to clipboard.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be copied to the clipboard.',
            'error'
        )
    }
}

const handleDownload = async (fileId: string) => {
    try {
        await downloadFile(fileId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be downloaded.', 'error')
    }
}

const handleDelete = async (fileId: any) => {
    if (isLoading.value || isBulkDeleting.value) return

    try {
        await deleteFile(fileId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be deleted.', 'error')
    }
}

const isFileFavorite = (fileId: string) => {
    return favorites.value.some(favorite => {
        return favorite.file_id === fileId
    })
}

const handleFavorite = async (file: any) => {
    try {
        if (isFileFavorite(file.id)) {
            await removeFavorite(file.id, 'file')
            await fetchAll()

            openToast('File removed from favorites.', 'success')

            return
        }

        await addFavorite(file.id, 'file')
        await fetchAll()

        openToast('File favorited successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be favorited', 'error')
    }
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 24
})

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedFiles
} = usePagination(sortedFiles, itemsPerPage)

const { selectedItems: selectedFiles, allSelected, toggleSelectAll } = useSelection(paginatedFiles)

const selectionItems = computed(() =>
    selectedFiles.value.map(id => ({ id, type: 'file' as const }))
)

const handleSelectionMoved = async () => {
    selectedFiles.value = []
    await fetchAll()

    if (error.value) openToast(error.value, 'error')
}

const isBulkDeleting = ref(false)

const partiallySelected = computed(
    () =>
        !allSelected.value &&
        paginatedFiles.value.some(file => selectedFiles.value.includes(file.id))
)

const handleDeleteSelected = async () => {
    if (!selectedFiles.value.length || isLoading.value || isBulkDeleting.value) return

    isBulkDeleting.value = true

    try {
        const result = await deleteFiles([...selectedFiles.value])
        const deletedIds = new Set(result.deletedIds)

        selectedFiles.value = selectedFiles.value.filter(id => !deletedIds.has(id))
        files.value = files.value.filter(file => !deletedIds.has(file.id))

        if (result.failedIds.length) {
            openToast(`${result.failedIds.length} items could not be moved to Trash.`, 'error')
        }
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'Selected files could not be deleted.',
            'error'
        )
    } finally {
        isBulkDeleting.value = false
    }
}

watch(files, items => {
    const availableIds = new Set(items.map(file => file.id))
    selectedFiles.value = selectedFiles.value.filter(id => availableIds.has(id))
})

watch(totalPages, total => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, activeCategory, sortMode, viewMode], () => {
    currentPage.value = 1
})
</script>

<style scoped>
.files-page {
    width: 100%;
    flex: 1;
    min-height: 0;

    display: flex;
    flex-direction: column;

    background: transparent;

    box-sizing: border-box;

    overflow: hidden;
}

.files-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.files-toolbar {
    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    min-width: 0;
}

.toolbar-actions {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 0.5rem;
    flex-wrap: wrap;
    min-width: 0;
}

.files-subtoolbar {
    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.filter-btn {
    height: 2.5rem;

    padding: 0 0.75rem;

    color: #a8a8b0;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 6px;

    font-size: 0.875rem;
    font-weight: 500;

    cursor: pointer;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
    box-sizing: border-box;
}

.filter-btn:hover {
    color: #ffffff;

    background: #242429;

    border-color: #35353c;
}

.table-scroll {
    flex: 1;
    min-height: 0;

    overflow-y: auto;
    overflow-x: hidden;
}

.files-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
    border-radius: 0;
}

.files-table th,
.files-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.files-table thead th {
    height: 3.8rem;

    position: sticky;

    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.files-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.files-table tbody tr {
    transition:
        background 0.2s ease,
        color 0.2s ease;
}

.files-table tbody tr.selected {
    background: #242642;
}

.files-table tbody tr.selected:hover {
    background: #292c4d;
}

.files-table tbody tr.selected .file-icon {
    background: #343c8f;
    color: #ffffff;
}

.files-table tbody tr.selected td {
    color: #d1d2e5;
}

.files-table tbody tr:hover {
    background: #1f1f23;
}

.files-table th:first-child,
.files-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.file-checkbox {
    position: relative;
    appearance: none;
    -webkit-appearance: none;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 1.1rem;
    height: 1.1rem;
    margin: 0;
    box-sizing: border-box;
    background: #202024;
    border: 1px solid #505057;
    border-radius: 4px;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}

.file-checkbox:hover:not(:disabled) {
    border-color: #8b7cff;
}

.file-checkbox:checked,
.file-checkbox:indeterminate {
    background: #3c47be;
    border-color: #5965ed;
}

.file-checkbox:checked::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.15rem;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.file-checkbox:indeterminate::after {
    content: '';
    width: 0.55rem;
    height: 2px;
    margin: 0;
    background: #ffffff;
    border: 0;
    transform: none;
}

.file-checkbox:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.file-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.files-table th:nth-child(2),
.files-table td:nth-child(2) {
    width: 42%;
}

.name-header {
    display: flex;

    align-items: center;

    gap: 0.3rem;
}

.sort-icon {
    font-size: 1rem;
}

.file-name {
    display: flex;

    align-items: center;

    gap: 0.75rem;
}

.file-icon {
    width: 2.4rem;
    height: 2.4rem;

    display: flex;

    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #ffffff;

    background: #3c47be;

    border-radius: 6px;

    font-size: 1.15rem;
}

.file-info {
    display: flex;

    flex-direction: column;

    gap: 0.25rem;

    min-width: 0;
}

.name-input {
    width: 32rem;
    color: #ffffff;

    background: transparent;

    border: 1px solid transparent;
    border-radius: 6px;

    font-size: 0.875rem;
    font-weight: 600;

    white-space: nowrap;

    outline: none;
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    text-overflow: ellipsis;
}

.name-input.active {
    padding: 0.2rem 0.4rem;
    border-color: #3c47be;
}

.name-input:disabled {
    pointer-events: none;
}

.file-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
    font-weight: 400;
    line-height: 1.5;
}

.video-play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 1.4rem;
    pointer-events: none;
    z-index: 1;
}

.file-card:hover .video-play-icon {
    background: rgba(60, 71, 190, 0.9);
}

.files-toolbar :deep(.search-box) {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 32rem;
}

@media (max-width: 800px) {
    .files-toolbar :deep(.search-box) {
        flex-basis: 100%;
        max-width: none;
    }
}
</style>
