<template>
    <div class="favorites-page">
        <div class="favorites-header">
            <div class="favorites-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search favorites..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />
                </div>
            </div>

            <div class="favorites-subtoolbar">
                <div
                    class="favorites-filters"
                    aria-label="Favorite categories"
                >
                    <button
                        type="button"
                        class="filter-btn"
                        :class="{ active: activeCategory === 'All' }"
                        :aria-pressed="activeCategory === 'All'"
                        @click="activeCategory = 'All'"
                    >
                        All
                    </button>

                    <button
                        type="button"
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Files' }"
                        :aria-pressed="activeCategory === 'Files'"
                        @click="activeCategory = 'Files'"
                    >
                        Files
                    </button>

                    <button
                        type="button"
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Folders' }"
                        :aria-pressed="activeCategory === 'Folders'"
                        @click="activeCategory = 'Folders'"
                    >
                        Folders
                    </button>

                    <button
                        type="button"
                        class="filter-btn"
                        :class="{ active: activeCategory === 'Notes' }"
                        :aria-pressed="activeCategory === 'Notes'"
                        @click="activeCategory = 'Notes'"
                    >
                        Notes
                    </button>
                </div>

                <SortDropdown v-model="sortMode" />
            </div>
        </div>

        <DataView :view-mode="viewMode">
            <template
                v-if="filteredFavorites.length === 0"
                #empty
            >
                <div class="empty-state">
                    <Icon
                        name="solar:star-bold"
                        class="empty-state-icon"
                    />

                    <strong>No favorites yet</strong>

                    <span class="empty-state-description">
                        Your favorite files, folders and notes will appear here.
                    </span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll">
                    <table class="favorites-table">
                        <thead>
                            <tr>
                                <th scope="col">
                                    <input
                                        type="checkbox"
                                        class="favorite-checkbox"
                                        aria-label="Select all favorites on this page"
                                        :checked="allSelected"
                                        @change="toggleSelectAll"
                                    />
                                </th>

                                <th scope="col">
                                    <div class="name-header">
                                        Name
                                        <Icon
                                            name="solar:sort-vertical-linear"
                                            class="sort-icon"
                                        />
                                    </div>
                                </th>

                                <th scope="col">Type</th>
                                <th scope="col">Size</th>
                                <th scope="col">Added</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="item in paginatedItems"
                                :key="item.id"
                                :class="{ selected: selectedFavorites.includes(item.id) }"
                                @dblclick="openItem(item)"
                            >
                                <td>
                                    <input
                                        v-model="selectedFavorites"
                                        type="checkbox"
                                        class="favorite-checkbox"
                                        :value="item.id"
                                        :aria-label="'Select ' + getItemName(item)"
                                    />
                                </td>

                                <td>
                                    <input
                                        type="text"
                                        class="name-input"
                                        :data-file-id="item.id"
                                        :class="{ active: editingItemId === item.id }"
                                        :value="
                                            editingItemId === item.id
                                                ? editingItemName
                                                : getItemName(item)
                                        "
                                        :disabled="editingItemId !== item.id"
                                        @input="
                                            editingItemName = ($event.target as HTMLInputElement)
                                                .value
                                        "
                                        @keyup.enter="saveRename(item)"
                                        @blur="editingItemId === item.id && saveRename(item)"
                                    />
                                </td>

                                <td class="favorite-type">{{ getItemType(item) }}</td>
                                <td>{{ getItemSize(item) }}</td>
                                <td>{{ formatTime(item.created_at) }}</td>

                                <td>
                                    <ItemMenu
                                        :type="getItemType(item)"
                                        :actions="[...getItemActions(item)]"
                                        :is-favorite="true"
                                        @click.stop
                                        @dblclick.stop
                                        @open="openItem(item)"
                                        @edit="openItem(item)"
                                        @rename="startRename(item)"
                                        @favorite="handleRemove(item)"
                                        @delete="handleDelete(item)"
                                        @download="handleDownload(item)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #grid>
                <div
                    v-for="item in paginatedItems"
                    :key="item.id"
                    class="favorite-card"
                    @click="openItem(item)"
                >
                    <div class="favorite-card-top">
                        <div class="favorite-card-icon">
                            <Icon :name="getItemIcon(item)" />
                        </div>

                        <ItemMenu
                            :type="getItemType(item)"
                            :actions="[...getItemActions(item)]"
                            :is-favorite="true"
                            @click.stop
                            @dblclick.stop
                            @open="openItem(item)"
                            @edit="openItem(item)"
                            @rename="startRename(item)"
                            @favorite="handleRemove(item)"
                            @delete="handleDelete(item)"
                            @download="handleDownload(item)"
                        />
                    </div>

                    <div class="favorite-card-info">
                        <input
                            type="text"
                            class="name-input"
                            :data-file-id="item.id"
                            :class="{ active: editingItemId === item.id }"
                            :value="editingItemId === item.id ? editingItemName : getItemName(item)"
                            :disabled="editingItemId !== item.id"
                            @input="editingItemName = ($event.target as HTMLInputElement).value"
                            @keyup.enter="saveRename(item)"
                            @blur="editingItemId === item.id && saveRename(item)"
                        />
                        <span class="favorite-type">{{ getItemType(item) }}</span>
                    </div>

                    <div class="favorite-card-bottom">
                        <span>{{ getItemSize(item) }}</span>
                        <span>{{ formatTime(item.created_at) }}</span>
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
definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

import {
    getItemIcon,
    getItemName,
    getItemType,
    getItemId,
    getItemActions,
    formatTime
} from '~/utils/favorite'

const { toastMessage, toastType, showToast, openToast } = useToast()

const { addFavorite, removeFavorite } = useFavoriteActions()

const { renameFile, downloadFile, deleteFile, isDeleting: isDeletingFile } = useFileActions()
const { deleteFolder, isDeleting: isDeletingFolder } = useFolderActions()
const { deleteNote, isDeleting: isDeletingNote } = useNoteActions()

const isDeleting = computed(
    () => isDeletingFile.value || isDeletingFolder.value || isDeletingNote.value
)

const { favorites, error, fetchAll } = useUser()

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const activeCategory = ref('All')

const filteredFavorites = computed(() => {
    return favorites.value.filter(item => {
        const itemType = getItemType(item)
        const matchesCategory =
            activeCategory.value === 'All' ||
            activeCategory.value === `${itemType.charAt(0).toUpperCase()}${itemType.slice(1)}s`

        const matchesSearch = getItemName(item)
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const { sortedItems: sortedFavorites } = useSort(
    filteredFavorites,
    sortMode,
    item => getItemName(item),
    item => item.created_at
)

const handleDelete = async (item: any) => {
    if (isDeleting.value) return

    try {
        const type = getItemType(item)
        const itemId = getItemId(item)

        if (type === 'file') await deleteFile(itemId)
        else if (type === 'folder') await deleteFolder(itemId)
        else await deleteNote(itemId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not move item to Trash.', 'error')
    }
}

const handleRemove = async (item: any) => {
    try {
        const type = getItemType(item)
        const itemId = getItemId(item)

        await removeFavorite(itemId, type)
        await fetchAll()

        openToast('Removed from favorites.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not remove from favorites.', 'error')
    }
}

const openItem = (item: any) => {
    const type = getItemType(item)
    return navigateTo({
        path:
            '/' +
            (type === 'file' ? 'files' : type === 'folder' ? 'folders' : 'notes') +
            '/' +
            getItemId(item),
        query: { from: '/favorites' }
    })
}

const editingItemId = ref<string | null>(null)
const editingItemName = ref('')

const startRename = async (item: any) => {
    editingItemId.value = item.id
    editingItemName.value = getItemName(item)

    await nextTick()

    const input = document.querySelector(`[data-file-id="${item.id}"]`) as HTMLInputElement | null

    input?.focus()
    input?.select()
}

const renameItem = async (
    itemId: string,
    itemType: 'file' | 'folder' | 'note',
    newName: string
) => {
    if (itemType === 'file') {
        await renameFile(itemId, newName)
        return
    }

    // if (itemType === 'folder') {
    //     await renameFolder(itemId, newName)
    //     return
    // }

    // await renameNote(itemId, newName)
}

const saveRename = async (item: any) => {
    const newName = editingItemName.value.trim()

    if (!newName || newName === getItemName(item)) {
        editingItemId.value = null
        return
    }

    try {
        const type = getItemType(item)
        const itemId = getItemId(item)

        await renameItem(itemId, type, newName)
        await fetchAll()

        editingItemId.value = null

        openToast('Item renamed successfully', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Item could not be renamed.', 'error')
    }
}

const handleDownload = async (item: any) => {
    const type = getItemType(item)
    const itemId = getItemId(item)

    if (type === 'file') {
        try {
            await downloadFile(itemId)
        } catch (err: any) {
            openToast(err.data?.message || err.message || 'File could not be downloaded.', 'error')
        }
        return
    }

    // if (type === 'note') {
    //     downloadNote(itemId)
    //     return
    // }

    // if (type === 'folder') {
    //     downloadFolder(itemId)
    //     return
    // }
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})

const { currentPage, totalPages, paginatedItems } = usePagination(sortedFavorites, itemsPerPage)

const {
    selectedItems: selectedFavorites,
    allSelected,
    toggleSelectAll
} = useSelection(paginatedItems)

type FavoriteResource = (typeof favorites.value)[number] & {
    files?: { size?: number | string | null } | null
    notes?: { size?: number | string | null } | null
}

const getItemSize = (item: FavoriteResource) => {
    const size = item.file_id ? item.files?.size : item.note_id ? item.notes?.size : null

    return size == null ? '-' : formatFileSize(size)
}

watch([searchQuery, activeCategory, viewMode, sortMode], () => {
    currentPage.value = 1
})
</script>

<style scoped>
.favorites-page {
    width: 100%;
    height: 100%;
    min-height: 0;

    padding: 0 0.5rem;

    border-radius: 12px;

    display: flex;
    flex-direction: column;

    background: transparent;

    box-sizing: border-box;

    overflow: hidden;
}

.favorites-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.favorites-toolbar {
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

.favorites-subtoolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.favorites-filters {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 0.5rem;
    flex-wrap: wrap;
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

.favorites-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
    border-radius: 0;
}

.favorites-table th,
.favorites-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.favorites-table thead th {
    height: 3.8rem;

    position: sticky;

    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.favorites-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.favorites-table tbody tr {
    transition:
        background 0.2s ease,
        color 0.2s ease;
}

.favorites-table tbody tr.selected {
    background: #242642;
}

.favorites-table tbody tr.selected:hover {
    background: #292c4d;
}

.favorites-table tbody tr.selected .favorite-icon {
    background: #343c8f;
    color: #ffffff;
}

.favorites-table tbody tr.selected td {
    color: #d1d2e5;
}

.favorites-table tbody tr:hover {
    background: #1f1f23;
}

.favorites-table th:first-child,
.favorites-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.favorite-checkbox {
    appearance: none;

    -webkit-appearance: none;

    width: 1rem;
    height: 1rem;

    margin: 0;

    background: #1a1a1d;

    border: 1px solid #6b6b75;

    border-radius: 4px;

    cursor: pointer;
}

.favorite-checkbox:checked {
    background: #3c47be;

    border-color: #3c47be;
}

.favorite-checkbox:checked::after {
    content: '\2713';

    display: flex;

    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;

    color: #ffffff;

    font-size: 0.7rem;
    font-weight: 700;
}

.favorites-table th:nth-child(2),
.favorites-table td:nth-child(2) {
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
    background: #1f1f23;
    border-color: #3c47be;
    padding: 0.45rem 0.6rem;
}

.favorite-icon {
    width: 2.4rem;
    height: 2.4rem;

    display: flex;

    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #8b7cff;

    background: #29215c;

    border-radius: 6px;

    font-size: 1.15rem;
}

.favorite-info {
    display: flex;

    flex-direction: column;

    gap: 0.25rem;

    min-width: 0;
}

.favorite-info strong {
    color: #ffffff;

    font-size: 0.875rem;
    font-weight: 600;

    white-space: nowrap;
    line-height: 1.5;
}

.favorite-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
    font-weight: 400;
    line-height: 1.5;
}

.favorite-card {
    min-height: 10rem;

    padding: 0.75rem;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 24px;

    box-sizing: border-box;

    cursor: pointer;
    gap: 0.75rem;
}

.favorite-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.favorite-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.favorite-card-icon {
    width: 2.7rem;
    height: 2.7rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #8b7cff;

    background: #29215c;

    border-radius: 6px;

    font-size: 1.25rem;
}

.favorite-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.favorite-card-info strong {
    color: #ffffff;

    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.5;
}

.favorite-card-info span {
    color: #898991;

    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.5;
}

.favorite-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.5;
    gap: 0.5rem;
}

.favorite-type {
    text-transform: capitalize;
}

.favorites-toolbar :deep(.search-box) {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 32rem;
}

@media (max-width: 800px) {
    .favorites-toolbar :deep(.search-box) {
        flex-basis: 100%;
        max-width: none;
    }
}
</style>
