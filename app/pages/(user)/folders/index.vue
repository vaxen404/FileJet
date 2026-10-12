<script setup lang="ts">
import { formatFileTime } from '~/utils/file'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()
const { uploadFolders } = useFolderActions()

const { folders, favorites, pending, error, fetchAll } = useUser()
type FolderItem = (typeof folders.value)[number]

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')

const isDragging = ref(false)

const handleDrop = (event: DragEvent) => {
    isDragging.value = false
    
    const droppedFolders = event.dataTransfer?.files
    
    if (!droppedFolders?.length) return
    
    console.log('Upload folders:', droppedFolders)
}

const filteredFolders = computed(() => {
    return folders.value.filter(folder => {
        const matchesSearch = 
            folder.name
            .toLowerCase()
            .includes(searchQuery.value.trim().toLowerCase())

        return matchesSearch
    })

})

const sortMode = ref<
    'newest' |
    'oldest' |
    'name-asc' |
    'name-desc'
>('newest')

const { sortedItems: sortedFolders } = useSort(
    filteredFolders, sortMode, folder => folder.name, folder => folder.created_at
)

const handleFolders = async (folder: FileSystemDirectoryHandle) => {
    try {
        await uploadFolders(folder, fetchAll)
        openToast('Folder uploaded successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Folder upload failed.', 'error')
    }
}

const openFolder = (folder: FolderItem) => {
    console.log('Open:', folder.name);
}

const downloadFolder = (folder: FolderItem) => {
    console.log('Download:', folder.name);
}

const renameFolder = (folder: FolderItem) => {
    console.log('Rename:', folder.name);
}

const favoriteFolder = (folder: FolderItem) => {
    console.log('Favorite:', folder.name);
}

const deleteFolder = (folder: FolderItem) => {
    console.log('Delete:', folder.name);
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})

const { currentPage, totalPages, paginatedItems: paginatedFolders } = usePagination(
    sortedFolders,
    itemsPerPage
)

const { selectedItems: selectedFolders, allSelected, toggleSelectAll } = useSelection(paginatedFolders)
const partiallySelected = computed(() => {
    return !allSelected.value && paginatedFolders.value.some(folder => selectedFolders.value.includes(folder.id))
})

const isFolderFavorite = (folderId: string) => {
    return favorites.value.some(favorite => favorite.folder_id === folderId)
}

const handleDeleteSelected = () => {
    if (!selectedFolders.value.length || pending.value) return
    console.log('Delete selected folders:', [...selectedFolders.value])
}

watch(folders, (items) => {
    const availableIds = new Set(items.map(folder => folder.id))
    selectedFolders.value = selectedFolders.value.filter(id => availableIds.has(id))
})

watch(totalPages, (total) => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, sortMode, viewMode], () => {
    currentPage.value = 1
})
</script>

<template>
    <div class="folders-page">
        <div class="folders-header">
            <div class="folders-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search folders..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />

                    <UploadButton
                        text="Upload"
                        mode="folder"
                        @folder="handleFolders"
                    />
                </div>
            </div>

            <div class="folders-subtoolbar">
                <SortDropdown v-model="sortMode" />
            </div>

            <div v-if="selectedFolders.length" class="selection-toolbar" role="group" aria-label="Selected folders">
                <span role="status" aria-live="polite">{{ selectedFolders.length }} selected</span>

                <div class="selection-actions">
                    <button type="button" class="selection-btn" :disabled="pending" @click="selectedFolders = []">
                        Clear
                    </button>
                    <button type="button" class="selection-btn delete-selected-btn" :disabled="pending" @click="handleDeleteSelected">
                        <Icon name="solar:trash-bin-trash-bold" />
                        Delete Selected
                    </button>
                </div>
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-dragging="isDragging"
            :is-loading="pending"
            drop-text="Drop folders to upload"
            @dragover="isDragging = true"
            @dragleave="isDragging = false"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="loading-state" role="status" aria-live="polite">
                    <span class="loading-spinner" aria-hidden="true" />
                    <span>Loading folders...</span>
                </div>
            </template>

            <template v-if="!pending && filteredFolders.length === 0" #empty>
                <div class="empty-state">
                    <Icon name="solar:folder-linear" size="2.5rem" class="empty-state-icon empty-state-folder-icon" />
                    <strong>{{ folders.length ? 'No matching folders' : 'No folders yet' }}</strong>
                    <span class="empty-state-description">
                        {{ folders.length ? 'Try a different search.' : 'Create your first folder to organize your files.' }}
                    </span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll">
                    <table class="folders-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        class="folder-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="pending"
                                        aria-label="Select all folders on this page"
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
                                <th>Created</th>
                                <th>Modified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="folder in paginatedFolders"
                                :key="folder.id"
                                :class="{ selected: selectedFolders.includes(folder.id) }"
                                @dblclick="openFolder(folder)"
                            >
                                <td @dblclick.stop>
                                    <input
                                        v-model="selectedFolders"
                                        type="checkbox"
                                        class="folder-checkbox"
                                        :value="folder.id"
                                        :disabled="pending"
                                        :aria-label="`Select ${folder.name}`"
                                    >
                                </td>

                                <td>
                                    <div class="folder-name">
                                        <div class="folder-icon">
                                            <Icon name="solar:folder-bold" />
                                        </div>

                                        <div class="folder-info">
                                            <strong :title="folder.name">{{ folder.name }}</strong>
                                            <span>
                                                Folder • {{ formatFileTime(folder.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>Folder</td>
                                <td>{{ formatFileTime(folder.created_at) }}</td>
                                <td>{{ formatFileTime(folder.updated_at) }}</td>

                                <td @dblclick.stop>
                                    <ItemMenu
                                        type="folder"
                                        :actions="['open', 'download', 'rename', 'favorite', 'delete']"
                                        :is-favorite="isFolderFavorite(folder.id)"
                                        @open="openFolder(folder)"
                                        @download="downloadFolder(folder)"
                                        @rename="renameFolder(folder)"
                                        @favorite="favoriteFolder(folder)"
                                        @delete="deleteFolder(folder)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #grid>
                <div
                    v-for="folder in paginatedFolders"
                    :key="folder.id"
                    class="folder-card"
                    :class="{ selected: selectedFolders.includes(folder.id) }"
                    @dblclick="openFolder(folder)"
                >
                    <div class="folder-card-top">
                        <div class="folder-card-icon">
                            <Icon name="solar:folder-bold" />
                        </div>

                        <div class="folder-card-actions" @dblclick.stop>
                            <label class="folder-card-select">
                                <input
                                    v-model="selectedFolders"
                                    type="checkbox"
                                    class="folder-checkbox"
                                    :value="folder.id"
                                    :disabled="pending"
                                    :aria-label="`Select ${folder.name}`"
                                >
                            </label>

                            <ItemMenu
                                type="folder"
                                :actions="['open', 'download', 'rename', 'favorite', 'delete']"
                                :is-favorite="isFolderFavorite(folder.id)"
                                @open="openFolder(folder)"
                                @download="downloadFolder(folder)"
                                @rename="renameFolder(folder)"
                                @favorite="favoriteFolder(folder)"
                                @delete="deleteFolder(folder)"
                            />
                        </div>
                    </div>

                    <div class="folder-card-info">
                        <strong :title="folder.name">{{ folder.name }}</strong>
                        <span>Folder</span>
                    </div>

                    <div class="folder-card-bottom">
                        <span>{{ formatFileTime(folder.created_at) }}</span>
                        <span>{{ formatFileTime(folder.updated_at) }}</span>
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
.folders-page {
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

.folders-header  {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0 0.5rem;
}

.folders-toolbar {
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

.table-scroll {
    flex: 1;
    min-height: 0;

    overflow-y: auto;
    overflow-x: hidden;
}

.folders-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
    border-radius: 0;
}

.folders-table th,
.folders-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.folders-table thead th {
    height: 3.8rem;

    position: sticky;

    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.folders-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.folders-table tbody tr:hover {
    background: #1f1f23;
}

.folders-table th:first-child,
.folders-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.folder-checkbox {
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

.folder-checkbox:hover:not(:disabled) {
    border-color: #8b7cff;
}

.folder-checkbox:checked,
.folder-checkbox:indeterminate {
    background: #3c47be;
    border-color: #5965ed;
}

.folder-checkbox:checked::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.15rem;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.folder-checkbox:indeterminate::after {
    content: '';
    width: 0.55rem;
    height: 2px;
    margin: 0;
    background: #ffffff;
    border: 0;
    border-radius: 1px;
    transform: none;
}

.folder-checkbox:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.folder-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.folders-table th:nth-child(2),
.folders-table td:nth-child(2) {
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

.folder-name {
    display: flex;

    align-items: center;
    
    gap: 0.8rem;
}

.folder-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #6ea8ff;
    background: #1f2d4a;

    border: 1px solid #2f4770;
    border-radius: 0.55rem;

    font-size: 1.2rem;
}

.folder-info {
    display: flex;

    flex-direction: column;

    gap: 0.2rem;

    min-width: 0;
}

.folder-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
}

.folder-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.folder-card {
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

.folder-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.folder-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.folder-card-icon {
    width: 2.7rem;
    height: 2.7rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #6ea8ff;
    background: #1f2d4a;

    border: 1px solid #2f4770;
    border-radius: 0.55rem;

    font-size: 1.25rem;
}

.folder-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.folder-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.folder-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.folder-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}

.folders-subtoolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
}

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

.selection-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 2.35rem;
    padding: 0 1rem;
    color: #a8a8b0;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 0.6rem;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
}

.selection-btn:hover:not(:disabled) {
    color: #ffffff;
    background: #242429;
    border-color: #35353c;
}

.delete-selected-btn {
    color: #ff6b6b;
}

.delete-selected-btn:hover:not(:disabled) {
    color: #ff7d7d;
    background: #3a2024;
    border-color: #4a292d;
}

.selection-btn:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.selection-btn:disabled {
    opacity: 0.6;
    cursor: wait;
}

.table-scroll {
    overflow-x: auto;
}

.folders-table {
    min-width: 44rem;
    table-layout: fixed;
}

.folders-table tbody tr.selected {
    background: #201d2d;
}

.folder-info strong,
.folder-info span,
.folder-card-info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.folder-card,
.folder-card-info {
    min-width: 0;
}

.folder-card {
    transition: background 0.2s ease, border-color 0.2s ease;
}

.folder-card.selected {
    background: #201d2d;
    border-color: #6055b8;
}

.folder-card-icon {
    flex-shrink: 0;
}

.folder-card-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0.25rem;
}

.folder-card-select {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.45rem;
    cursor: pointer;
}

.folder-card-select:hover {
    background: #252529;
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    color: #a8a8b0;
    font-size: 0.85rem;
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
    to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
    .loading-spinner { animation: none; }
}


.folders-page :deep(.grid-view) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1500px) {
    .folders-page :deep(.grid-view) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 1100px) {
    .folders-page :deep(.grid-view) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 800px) {
    .folders-page :deep(.grid-view) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .folders-page :deep(.grid-view) {
        grid-template-columns: minmax(0, 1fr);
    }
}


@media (max-width: 800px) {
    .folders-toolbar {
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .folders-toolbar :deep(.search-box) {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
    }

    .toolbar-actions {
        flex-wrap: wrap;
        gap: 0.75rem;
    }
}
</style>
