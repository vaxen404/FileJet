<template>
    <div class="folders-page">
        <div class="folders-header">
            <div class="folders-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search folders..."
                />

                <div class="toolbar-actions">
                    <SortDropdown v-model="sortMode" />
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton
                        text="Upload"
                        mode="folder"
                        @folder="handleFolders"
                    />

                    <button
                        type="button"
                        class="new-folder-button"
                        :disabled="pending || folderActions.isLoading.value"
                        @click="createFolder"
                    >
                        <Icon
                            name="solar:add-folder-bold"
                            class="new-folder-icon"
                        />
                        <span>New Folder</span>
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
                <div class="loading-state">
                    <span class="loading-spinner" />
                    <span>Loading folders...</span>
                </div>
            </template>

            <template
                v-if="!pending && filteredFolders.length === 0"
                #empty
            >
                <div class="empty-state">
                    <Icon
                        name="solar:folder-linear"
                        size="2.5rem"
                        class="empty-state-icon empty-state-folder-icon"
                    />
                    <strong>{{ folders.length ? 'No matching folders' : 'No folders yet' }}</strong>
                    <span class="empty-state-description">
                        {{
                            folders.length
                                ? 'Try a different search.'
                                : 'Create your first folder to organize your files.'
                        }}
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
                                @click="openFolder(folder)"
                                @contextmenu.prevent.stop="openContextMenu($event, folder.id)"
                            >
                                <td @click.stop>
                                    <input
                                        v-model="selectedFolders"
                                        type="checkbox"
                                        class="folder-checkbox"
                                        :value="folder.id"
                                        :disabled="pending"
                                    />
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

                                <td @click.stop>
                                    <ItemMenu
                                        :ref="menu => setFolderMenuRef(folder.id, menu)"
                                        type="folder"
                                        :actions="[
                                            'open',
                                            'download',
                                            'rename',
                                            'favorite',
                                            'delete'
                                        ]"
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
                <ItemGrid>
                    <ItemGridCard
                        v-for="folder in paginatedFolders"
                        :key="folder.id"
                        :title="folder.name"
                        icon="solar:folder-bold"
                        :selected="selectedFolders.includes(folder.id)"
                        @click="openFolder(folder)"
                        @contextmenu.prevent.stop="openContextMenu($event, folder.id)"
                    >
                        <template #actions>
                            <label class="file-select">
                                <input
                                    v-model="selectedFolders"
                                    type="checkbox"
                                    class="folder-checkbox"
                                    :value="folder.id"
                                    :disabled="pending"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setFolderMenuRef(folder.id, menu)"
                                type="folder"
                                :actions="['open', 'rename', 'download', 'favorite', 'delete']"
                                :is-favorite="isFolderFavorite(folder.id)"
                                @open="openFolder(folder)"
                                @rename="renameFolder(folder)"
                                @download="downloadFolder(folder)"
                                @favorite="favoriteFolder(folder)"
                                @delete="deleteFolder(folder)"
                            />
                        </template>
                        <template #metadata>
                            <span>Folder</span>
                            ·
                            <span>{{ formatFileTime(folder.created_at) }}</span>
                        </template>
                    </ItemGridCard>
                </ItemGrid>
            </template>
        </DataView>

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="viewMode"
        />
        <SelectionToolbar
            :items="selectionItems"
            :busy="pending || folderActions.isLoading.value"
            :current-folder-id="null"
            @clear="selectedFolders = []"
            @delete="handleDeleteSelected"
            @moved="handleSelectionMoved"
        />
        <FolderFormModal
            :open="folderModalOpen"
            @close="folderModalOpen = false"
            @saved="handleFolderSaved"
        />
    </div>
</template>

<script setup lang="ts">
import { formatFileTime } from '~/utils/file'
import { ref, type ComponentPublicInstance } from 'vue'
import FolderFormModal from '~/components/ui/FolderFormModal.vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()
const folderActions = useFolderActions()
const { uploadFolders } = folderActions
const { addFavorite, removeFavorite } = useFavoriteActions()

const { folders, favorites, pending, error, fetchAll } = useUser()
type FolderItem = (typeof folders.value)[number]
const folderModalOpen = ref(false)

const createFolder = (): void => {
    if (pending.value || folderActions.isLoading.value) return

    folderModalOpen.value = true
}

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const folderMenus = new Map<string, InstanceType<typeof ItemMenu>>()

const setFolderMenuRef = (id: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) folderMenus.set(id, menu as InstanceType<typeof ItemMenu>)
    else folderMenus.delete(id)
}

const openContextMenu = (event: MouseEvent, id: string) => {
    folderMenus.get(id)?.openAt(event.clientX, event.clientY)
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('grid')

const isDragging = ref(false)

const handleDrop = (event: DragEvent) => {
    isDragging.value = false

    const droppedFolders = event.dataTransfer?.files

    if (!droppedFolders?.length) return

    handleFolders(droppedFolders)
}

const filteredFolders = computed(() => {
    return folders.value.filter(folder => {
        const matchesSearch = folder.name
            .toLowerCase()
            .includes(searchQuery.value.trim().toLowerCase())

        return matchesSearch
    })
})

const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const { sortedItems: sortedFolders } = useSort(
    filteredFolders,
    sortMode,
    folder => folder.name,
    folder => folder.created_at
)

const handleFolders = async (folder: FileSystemDirectoryHandle | FileList) => {
    try {
        await uploadFolders(folder, fetchAll)
        openToast('Folder uploaded successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Folder upload failed.', 'error')
    }
}

const openFolder = (folder: FolderItem) =>
    navigateTo({ path: '/folders/' + folder.id, query: { from: '/folders' } })

const downloadFolder = (folder: FolderItem) => folderActions.downloadFolder(folder.id)

const renameFolder = (folder: FolderItem) =>
    navigateTo({ path: '/folders/' + folder.id, query: { from: '/folders', tab: 'edit' } })

const favoriteFolder = async (folder: FolderItem) => {
    try {
        if (isFolderFavorite(folder.id)) await removeFavorite(folder.id, 'folder')
        else await addFavorite(folder.id, 'folder')

        await fetchAll()

        if (error.value) throw new Error(error.value)

        openToast('Favorite updated.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not update favorite.', 'error')
    }
}

const deleteFolder = async (folder: FolderItem) => {
    if (folderActions.isDeleting.value) return

    try {
        await folderActions.deleteFolder(folder.id)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not delete folder.', 'error')
    }
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 24
})

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedFolders
} = usePagination(sortedFolders, itemsPerPage)

const handleFolderSaved = async (): Promise<void> => {
    searchQuery.value = ''
    sortMode.value = 'newest'
    currentPage.value = 1
    await fetchAll()

    if (error.value) openToast(error.value, 'error')
}

const {
    selectedItems: selectedFolders,
    allSelected,
    toggleSelectAll
} = useSelection(paginatedFolders)

const selectionItems = computed(() =>
    selectedFolders.value.map(id => ({ id, type: 'folder' as const }))
)

const handleSelectionMoved = async () => {
    selectedFolders.value = []
    await fetchAll()

    if (error.value) openToast(error.value, 'error')
}

const partiallySelected = computed(() => {
    return (
        !allSelected.value &&
        paginatedFolders.value.some(folder => selectedFolders.value.includes(folder.id))
    )
})

const isFolderFavorite = (folderId: string) => {
    return favorites.value.some(favorite => favorite.folder_id === folderId)
}

const handleDeleteSelected = async () => {
    if (!selectedFolders.value.length || pending.value || folderActions.isDeleting.value) return

    try {
        const result = await folderActions.deleteFolders([...selectedFolders.value])
        const deleted = new Set(result.deletedIds)

        selectedFolders.value = selectedFolders.value.filter(id => !deleted.has(id))

        if (result.failedIds.length) {
            openToast(`${result.failedIds.length} items could not be moved to Trash.`, 'error')
        }
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not delete folders.', 'error')
    }
}

watch(folders, items => {
    const availableIds = new Set(items.map(folder => folder.id))
    selectedFolders.value = selectedFolders.value.filter(id => availableIds.has(id))
})

watch(totalPages, total => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, sortMode, viewMode], () => {
    currentPage.value = 1
})
</script>

<style scoped>
.folders-page {
    width: 100%;
    flex: 1;
    min-height: 0;

    display: flex;
    flex-direction: column;

    background: transparent;

    box-sizing: border-box;

    overflow: hidden;
}

.folders-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.folders-toolbar {
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

.new-folder-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    gap: 0.5rem;
    height: var(--ui-control-height, 2.5rem);
    padding: 0 0.875rem;
    box-sizing: border-box;
    color: #fff;
    background: #424dcc;
    border: 1px solid #626de5;
    border-radius: var(--ui-control-radius, 8px);
    box-shadow:
        inset 0 1px 0 #ffffff12,
        0 2px 6px #0003;
    font-family: 'Inter', sans-serif;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    line-height: 1.5;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background 0.18s ease,
        border-color 0.18s ease,
        transform 0.18s ease;
}

.new-folder-icon {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
    color: #ffffff;
    font-size: var(--ui-control-icon-size, 1.125rem);
}

.new-folder-button:hover:not(:disabled) {
    background: #505ed8;
    border-color: #818bf3;
    transform: translateY(-1px);
}

.new-folder-button:active:not(:disabled) {
    background: #3944b8;
    transform: translateY(0);
    box-shadow: inset 0 1px 3px #0003;
}

.new-folder-button:focus-visible {
    outline: 2px solid #d3d7ff;
    outline-offset: -4px;
}

.new-folder-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
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
    border-radius: 4px;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease;
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

    gap: 0.75rem;
}

.folder-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #ffffff;
    background: #3c47be;

    border: 1px solid #3c47be;
    border-radius: 6px;

    font-size: 1.2rem;
}

.folder-info {
    display: flex;

    flex-direction: column;

    gap: 0.25rem;

    min-width: 0;
}

.folder-info strong {
    color: #ffffff;

    font-size: 0.875rem;
    font-weight: 600;

    white-space: nowrap;
    line-height: 1.5;
}

.folder-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
    font-weight: 400;
    line-height: 1.5;
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
.folder-info span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    to {
        transform: rotate(360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .new-folder-button {
        transition: none;
    }

    .new-folder-button:hover:not(:disabled) {
        transform: none;
    }

    .loading-spinner {
        animation: none;
    }
}

@media (max-width: 800px) {
    .folders-toolbar :deep(.search-box) {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
    }
}
</style>
