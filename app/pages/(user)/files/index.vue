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
                    <UploadButton text="Upload" mode="file" @files="handleFiles"/>
                </div>
            </div>

            <div class="files-subtoolbar">
                <ItemFilters v-model="activeCategory" :options="filterOptions" label="Filter files" />

                <SortDropdown v-model="sortMode" /> 
            </div>

            <div v-if="selectedFiles.length" class="selection-toolbar" role="group" aria-label="Selected files">
                <span role="status" aria-live="polite">{{ selectedFiles.length }} selected</span>

                <div class="selection-actions">
                    <button
                        type="button"
                        class="filter-btn"
                        :disabled="isLoading || isBulkDeleting"
                        @click="selectedFiles = []"
                    >
                        Clear
                    </button>

                    <button
                        type="button"
                        class="filter-btn delete-selected-btn"
                        :disabled="isLoading || isBulkDeleting"
                        :aria-busy="isBulkDeleting"
                        @click="handleDeleteSelected"
                    >
                        <Icon name="solar:trash-bin-trash-bold" />
                        {{ isBulkDeleting ? 'Deleting...' : 'Delete Selected' }}
                    </button>
                </div>
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-dragging="isDragging"
            :is-loading="isLoading || isBulkDeleting"
            drop-text="Drop files to upload"
            @dragover="isDragging = true"
            @dragleave="isDragging = false"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="upload-loading" role="status" aria-live="polite">
                    <template v-if="isUploading && uploadProgress !== null">
                        <span>{{ uploadProgress }}%</span>

                        <div class="upload-progress">
                            <div
                                class="upload-progress-bar"
                                :style="{ width: `${uploadProgress}%` }"
                            ></div>
                        </div>
                    </template>

                    <div v-if="isDeleting || !isUploading || uploadProgress === null" class="operation-loading">
                        <span class="loading-spinner" aria-hidden="true"></span>
                        <span>{{ isDeleting || isBulkDeleting ? 'Deleting files...' : isUploading ? 'Uploading files...' : 'Updating file...' }}</span>
                    </div>
                </div>
            </template>

            <template v-if="!isLoading && !isBulkDeleting && files.length === 0" #empty>
                <div class="empty-state">
                    <Icon name="solar:file-bold" size="2.5rem" class="empty-state-icon" />
                    <strong>No files yet</strong>
                    <span class="empty-state-description">Upload your first file to get started.</span>
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
                                        aria-label="Select all files on this page"
                                        @change="toggleSelectAll"
                                    >
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
                                        :aria-label="`Select ${file.name}`"
                                    >
                                </td>

                                <td>
                                    <div class="file-name">
                                        <div class="file-icon">
                                            <Icon :name="getFileIcon(file.mime_type, file.original_name)" />
                                        </div>

                                        <div class="file-info">
                                            <input 
                                                type="text" 
                                                class="name-input" 
                                                :data-file-id="file.id"
                                                :class="{ active: editingFileId === file.id}"
                                                :value="editingFileId === file.id ? editingFileName : file.name"
                                                :disabled="editingFileId !== file.id"
                                                @input="editingFileName = ($event.target as HTMLInputElement).value"
                                                @keyup.enter="saveRename(file)"
                                                @blur="editingFileId === file.id && saveRename(file)"
                                                @click.stop
                                            >
                                            <span>
                                                {{ formatFileSize(file.size) }} • {{ formatFileTime(file.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>{{ getFileType(file.original_name) }}</td>
                                <td>{{ formatFileSize(file.size) }}</td>
                                <td>{{ formatFileTime(file.updated_at) }}</td>

                                <td @click.stop>
                                    <ItemMenu
                                        :ref="(menu) => setFileMenuRef(file.id, menu)"
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
                <div class="files-grid">
                    <div
                        v-for="file in paginatedFiles"
                        :key="file.id"
                        class="file-card"
                        :class="{ selected: selectedFiles.includes(file.id) }"
                        @click="openFile(file)"
                        @contextmenu.prevent.stop="openContextMenu($event, file.id)"
                    >
                        <div class="file-preview">
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
                            >

                            <video
                                v-else-if="file.mime_type?.startsWith('video/')"
                                :src="`/api/files/${file.id}/preview`"
                                class="file-preview-image"
                                preload="metadata"
                                muted
                                playsinline
                            />

                            <div v-else class="file-preview-placeholder">
                                <Icon :name="getFileIcon(file.mime_type, file.original_name)" />
                            </div>

                            <div class="file-overlay" @click.stop>
                                <label class="file-select">
                                    <input
                                        v-model="selectedFiles"
                                        type="checkbox"
                                        :value="file.id"
                                        :disabled="isLoading || isBulkDeleting"
                                        :aria-label="`Select ${file.name}`"
                                    >
                                </label>

                                <ItemMenu
                                    :ref="(menu) => setFileMenuRef(file.id, menu)"
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
                            </div>
                        </div>

                        <div class="file-details">
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
                            >

                            <div class="file-metadata">
                                <span>{{ formatFileSize(file.size) }}</span>
                                <span>{{ formatFileTime(file.created_at) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

        </DataView>

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="viewMode"
        />

    </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'
import { canCopyFile, getFileIcon, getFileType, getFileCategory,formatFileSize, formatFileTime} from "~/utils/file"

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { toastMessage, toastType, showToast, openToast } = useToast()

const {
    isLoading,
    isUploading,
    isDeleting,
    uploadProgress,
    uploadFiles,
    deleteFile,
    deleteFiles,
    renameFile,
    copyFile,
    downloadFile,
} = useFileActions()

const { addFavorite, removeFavorite } = useFavoriteActions()

const { files, favorites, error, fetchAll } = useUser()

await fetchAll()

if (error.value) {
openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const activeCategory = ref('All')
const filterOptions = ['All', 'Images', 'Documents', 'Videos', 'Compressed', 'Others']

const isDragging = ref(false)

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

    const input = document.querySelector(
        `[data-file-id="${file.id}"]`
    ) as HTMLInputElement | null

    input?.focus()
    input?.select()
}

const handleDrop = async (event: DragEvent) => {
    isDragging.value = false
    
    const droppedFiles = event.dataTransfer?.files
    
    if (!droppedFiles?.length) return

    try {
        await uploadFiles(droppedFiles, fetchAll)

        openToast('File uploaded successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File upload failed.', 'error')
    }
}

const filteredFiles = computed(() => {
    return files.value.filter(file => {
        const matchesCategory = 
            activeCategory.value === 'All' || 
            getFileCategory(file.original_name) === activeCategory.value

        const matchesSearch = 
            file.name
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const sortMode = ref<
    'newest' |
    'oldest' |
    'name-asc' |
    'name-desc'
>('newest')

const { sortedItems: sortedFiles } = useSort(
    filteredFiles, sortMode, file => file.name, file => file.created_at
)

const handleFiles = async (files: FileList) => {
    if (!files.length) {
        openToast('Please select a file', 'error')
        return
    }

    try {
        await uploadFiles(files, fetchAll)

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
        openToast(
            err.data?.message || err.message || 'File could not be renamed.',
            'error'
        )
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
    try {
        await deleteFile(fileId, fetchAll)
        
        openToast('File deleted successfully.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be deleted.',
            'error'
        )
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
        openToast(
            err.data?.message || err.message || 'File could not be favorited',
            'error'
        )
    }
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})

const { currentPage, totalPages, paginatedItems: paginatedFiles} = usePagination(
    sortedFiles,
    itemsPerPage
)

const { selectedItems: selectedFiles, allSelected, toggleSelectAll } = useSelection(paginatedFiles)
const isBulkDeleting = ref(false)
const partiallySelected = computed(() => !allSelected.value && paginatedFiles.value.some(file => selectedFiles.value.includes(file.id)))

const handleDeleteSelected = async () => {
    if (!selectedFiles.value.length || isLoading.value || isBulkDeleting.value) return

    isBulkDeleting.value = true

    try {
        const result = await deleteFiles([...selectedFiles.value])
        const deletedIds = new Set(result.deletedIds)

        selectedFiles.value = selectedFiles.value.filter(id => !deletedIds.has(id))
        files.value = files.value.filter(file => !deletedIds.has(file.id))
        await fetchAll()

        const deletedCount = result.deletedIds.length
        const failedCount = result.failedIds.length
        const message = failedCount
            ? `${deletedCount} file${deletedCount === 1 ? '' : 's'} deleted. ${failedCount} could not be deleted.`
            : `${deletedCount} file${deletedCount === 1 ? '' : 's'} deleted successfully.`

        openToast(error.value ? `${message} ${error.value}` : message, result.failedIds.length || error.value ? 'error' : 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Selected files could not be deleted.', 'error')
    } finally {
        isBulkDeleting.value = false
    }
}

watch(files, (items) => {
    const availableIds = new Set(items.map(file => file.id))
    selectedFiles.value = selectedFiles.value.filter(id => availableIds.has(id))
})

watch(totalPages, (total) => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, activeCategory, viewMode], () => {
    currentPage.value = 1
})

</script>

<style scoped>
.selection-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 0.875rem;
    color: #a8a8b0;
    font-size: 0.85rem;
}

.selection-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.selection-actions .delete-selected-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #ff6b6b;
}

.selection-actions .delete-selected-btn:hover {
    background: #3a2024;
    border-color: #4a292d;
    color: #ff7d7d;
}

.selection-actions button:disabled {
    opacity: 0.6;
    cursor: wait;
}

.files-page {
    width: 100%;
    flex: 1;
    min-height: 0;

    padding: 0.4rem 0.5rem;

    border-radius: 1rem;

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

    padding: 0 0.5rem;
}

.files-toolbar {
    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;

    margin-bottom: 0.875rem;
}

.toolbar-actions {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 1rem;
}

.files-subtoolbar {
    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.filter-btn {
    height: 2.35rem;

    padding: 0 1rem;

    color: #a8a8b0;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 0.6rem;

    font-size: 0.85rem;
    font-weight: 500;

    cursor: pointer;

    transition:
        background 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
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
    border-radius: 0.3rem;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
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
    border-radius: 1px;
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

    gap: 0.8rem;
}

.file-icon {
    width: 2.4rem;
    height: 2.4rem;

    display: flex;

    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #8b7cff;

    background: #29215c;

    border-radius: 0.55rem;

    font-size: 1.15rem;
}

.file-info {
    display: flex;

    flex-direction: column;

    gap: 0.2rem;

    min-width: 0;
}

.name-input {
    width: 32rem;
    color: #ffffff;

    background: transparent;

    border: 1px solid transparent;
    border-radius: 0.5rem;

    
    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
    
    outline: none;
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
}

.file-card {
    min-width: 0;
    min-height: 10rem;

    padding: 1rem;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 0.625rem;

    box-sizing: border-box;
    
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
}

.file-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.file-card.selected {
    background: #201d2d;
    border-color: #6055b8;
}

.file-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.file-card-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
}

.file-card-select {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.45rem;
    cursor: pointer;
}

.file-card-select:hover {
    background: #252529;
}

.file-card-icon {
    flex-shrink: 0;
    width: 2.7rem;
    height: 2.7rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #8b7cff;

    background: #29215c;

    border-radius: 0.55rem;

    font-size: 1.25rem;
}

.file-card-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.file-card-info .name-input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    text-overflow: ellipsis;
}

.file-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.file-card-info span {
    color: #898991;

    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}


.files-page :deep(.grid-view) {
    display: block;
}

.files-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1rem;
}

.file-card {
    min-width: 0;
    overflow: hidden;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 0.8rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
}

.file-card:hover {
    background: #202024;
    border-color: #454550;
}

.file-card.selected {
    border-color: #7063d8;
    background: #211f30;
}

.file-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #141417;
}

.file-preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
}

.file-card:hover .file-preview-image {
    transform: scale(1.035);
}

.file-preview-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8b7cff;
    font-size: 3.5rem;
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

.file-overlay {
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.65rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}

.file-card:hover .file-overlay,
.file-card.selected .file-overlay,
.file-card:focus-within .file-overlay {
    opacity: 1;
    pointer-events: auto;
}

.file-select {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #242429;
    border: 1px solid #3a3a42;
    border-radius: 0.5rem;
    cursor: pointer;
}

.file-select input {
    width: 1.1rem;
    height: 1.1rem;
    margin: 0;
    accent-color: #7063d8;
    cursor: pointer;
}

.file-overlay :deep(.item-menu-trigger) {
    background: #242429;
    border-radius: 0.5rem;
}

.file-details {
    padding: 0.8rem 0.9rem;
}

.file-name-input {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0.2rem 0;
    border: 1px solid transparent;
    background: transparent;
    color: #f3f3f5;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    outline: none;
    box-sizing: border-box;
}

.file-name-input:disabled {
    opacity: 1;
    -webkit-text-fill-color: #f3f3f5;
    cursor: pointer;
}

.file-name-input.active {
    border-color: #7063d8;
    border-radius: 0.35rem;
    padding: 0.2rem 0.4rem;
}

.file-metadata {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.4rem;
    color: #898991;
    font-size: 0.73rem;
}

@media (max-width: 1500px) {
    .files-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 1100px) {
    .files-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 800px) {
    .files-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .files-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (hover: none) {
    .file-overlay {
        opacity: 1;
        pointer-events: auto;
    }
}

</style>
