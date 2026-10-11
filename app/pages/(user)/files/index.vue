<script setup lang="ts">
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
const viewMode = ref<'list' | 'grid'>('list')
const activeCategory = ref('All')

const isDragging = ref(false)

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
    } catch {
        openToast('File upload failed.', 'error')
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
    } catch {
        openToast('File upload failed.', 'error')
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
            err.data?.message || 'File could not be renamed.',
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

const handleDelete = async (fileId: any) => {
    try {
        await deleteFile(fileId, fetchAll)
        
        openToast('File deleted successfully.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || 'File could not be deleted.',
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
            err.data?.message || 'File could not be favorited',
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
                <div class="file-filters">
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'All'}"
                        @click="activeCategory = 'All'"
                    >
                        All
                    </button>
    
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Images'}"
                        @click="activeCategory = 'Images'"
                    >
                        Images
                    </button>
    
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Documents'}"
                        @click="activeCategory = 'Documents'"
                    >
                        Documents
                    </button>
    
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Videos'}"
                        @click="activeCategory = 'Videos'"
                    >
                        Videos
                    </button>
    
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Compressed'}"
                        @click="activeCategory = 'Compressed'"
                    >
                        Compressed
                    </button>
    
                    <button
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Others'}"
                        @click="activeCategory = 'Others'"
                    >
                        Others
                    </button>
                </div>

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
                            >
                                <td>
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
                                            <Icon :name="getFileIcon(file.mime_type)" />
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

                                <td>
                                    <ItemMenu
                                        type="file"
                                        :is-favorite="isFileFavorite(file.id)"
                                        :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                        @open="openFile(file)"
                                        @download="downloadFile(file.id)"
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
                <div
                    v-for="file in paginatedFiles"
                    :key="file.id"
                    class="file-card"
                >
                    <div class="file-card-top">
                        <div class="file-card-selection">
                            <input
                                v-model="selectedFiles"
                                type="checkbox"
                                class="file-checkbox"
                                :value="file.id"
                                :disabled="isLoading || isBulkDeleting"
                                :aria-label="`Select ${file.name}`"
                            >

                            <div class="file-card-icon">
                                <Icon :name="getFileIcon(file.mime_type)" />
                            </div>
                        </div>

                        <ItemMenu
                            type="file"
                            :is-favorite="isFileFavorite(file.id)"
                            :can-copy="canCopyFile(file.mime_type, file.original_name)"
                            @open="openFile(file)"
                            @download="downloadFile(file.id)"
                            @rename="startRename(file)"
                            @copy="handleCopy(file.id)"
                            @favorite="handleFavorite(file)"
                            @delete="handleDelete(file.id)"
                        />
                    </div>

                    <div class="file-card-info">
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
                        >
                        <span>{{ file.mime_type }}</span>
                    </div>

                    <div class="file-card-bottom">
                        <span>{{ formatFileSize(file.size) }}</span>
                        <span>{{ formatFileTime(file.created_at) }}</span>
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

.selection-actions,
.file-card-selection {
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
}

.file-filters {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 0.5rem;

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

.filter-btn.active {
    color: #ffffff;

    background: #3c47be;

    border-color: #3c47be;
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
    appearance: none;

    -webkit-appearance: none;

    width: 1rem;
    height: 1rem;

    margin: 0;

    background: #1a1a1d;

    border: 1px solid #6b6b75;

    border-radius: 0.2rem;

    cursor: pointer;
}

.file-checkbox:checked {
    background: #3c47be;

    border-color: #3c47be;
}

.file-checkbox:checked::after {
    content: '✓';

    display: flex;

    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;

    color: #ffffff;

    font-size: 0.7rem;
    font-weight: 700;
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

.file-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.file-card {
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
}

.file-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.file-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.file-card-icon {
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
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.file-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.file-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.file-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}

.upload-loading {
    position: absolute;
    inset: 0;
    z-index: 50;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 0.8rem;

    background: rgba(18, 18, 20, 0.92);

    color: #ffffff;
}

.upload-loading > span {
    font-size: 1rem;
    font-weight: 600;
}

.operation-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
}

.loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #29292e;
    border-top-color: #3c47be;
    border-radius: 50%;
    animation: loading-spin 0.8s linear infinite;
}

@keyframes loading-spin {
    to {
        transform: rotate(360deg);
    }
}

.upload-progress {
    width: 16rem;
    height: 0.5rem;

    background: #29292e;

    border-radius: 999px;

    overflow: hidden;
}

.upload-progress-bar {
    height: 100%;

    background: #3c47be;

    border-radius: 999px;

    transition: width 0.15s ease;
}
</style>
