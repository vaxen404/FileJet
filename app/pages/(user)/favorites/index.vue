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
        >
            <template #loading>
                <div class="loading-state">Loading favorites...</div>
            </template>

            <template
                v-if="!isInitialLoading && filteredFavorites.length === 0"
                #empty
            >
                <div class="empty-state">
                    <Icon
                        name="solar:star-bold"
                        class="empty-state-icon"
                    />
                    <strong>{{ emptyTitle }}</strong>
                    <span class="empty-state-description">{{ emptyDescription }}</span>
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
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="busy"
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
                                @contextmenu.prevent.stop="openContextMenu($event, item.id)"
                            >
                                <td @dblclick.stop>
                                    <input
                                        v-model="selectedFavorites"
                                        type="checkbox"
                                        class="favorite-checkbox"
                                        :value="item.id"
                                        :disabled="busy"
                                    />
                                </td>
                                <td>
                                    <div class="favorite-name">
                                        <div
                                            class="favorite-icon"
                                            :class="getItemType(item)"
                                        >
                                            <Icon :name="itemIcon(item)" />
                                        </div>
                                        <div class="favorite-info">
                                            <strong :title="getItemName(item)">{{
                                                getItemName(item)
                                            }}</strong>
                                            <span
                                                >{{ getItemSize(item) }} ·
                                                {{ formatFileTime(item.created_at) }}</span
                                            >
                                        </div>
                                    </div>
                                </td>
                                <td class="favorite-type">{{ getItemType(item) }}</td>
                                <td>{{ getItemSize(item) }}</td>
                                <td>{{ formatFileTime(item.created_at) }}</td>
                                <td
                                    @click.stop
                                    @dblclick.stop
                                >
                                    <ItemMenu
                                        :ref="menu => setMenuRef(item.id, menu)"
                                        :type="getItemType(item)"
                                        :actions="[...getItemActions(item)]"
                                        :is-favorite="true"
                                        @open="openItem(item)"
                                        @edit="openItem(item)"
                                        @rename="renameItem(item)"
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
                <ItemGrid>
                    <ItemGridCard
                        v-for="item in paginatedItems"
                        :key="item.id"
                        :title="getItemName(item)"
                        :icon="itemIcon(item)"
                        :selected="selectedFavorites.includes(item.id)"
                        @click="openItem(item)"
                        @contextmenu.prevent.stop="openContextMenu($event, item.id)"
                    >
                        <template
                            v-if="hasMediaPreview(item)"
                            #preview
                        >
                            <img
                                v-if="item.files?.mime_type?.startsWith('image/')"
                                :src="`/api/files/${item.file_id}/preview`"
                                :alt="getItemName(item)"
                                loading="lazy"
                                class="file-preview-image"
                            />
                            <template v-else>
                                <div class="video-play-icon"><Icon name="solar:play-bold" /></div>
                                <video
                                    :src="`/api/files/${item.file_id}/preview`"
                                    class="file-preview-image"
                                    preload="metadata"
                                    muted
                                    playsinline
                                />
                            </template>
                        </template>

                        <template #actions>
                            <label class="file-select">
                                <input
                                    v-model="selectedFavorites"
                                    type="checkbox"
                                    class="favorite-checkbox"
                                    :value="item.id"
                                    :disabled="busy"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setMenuRef(item.id, menu)"
                                :type="getItemType(item)"
                                :actions="[...getItemActions(item)]"
                                :is-favorite="true"
                                @open="openItem(item)"
                                @edit="openItem(item)"
                                @rename="renameItem(item)"
                                @favorite="handleRemove(item)"
                                @delete="handleDelete(item)"
                                @download="handleDownload(item)"
                            />
                        </template>

                        <template #metadata>
                            <span class="favorite-type">{{ getItemType(item) }}</span>
                            ·
                            <span>{{ getItemSize(item) }}</span>
                            ·
                            <span>{{ formatFileTime(item.created_at) }}</span>
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
            :busy="busy"
            @clear="selectedFavorites = []"
            @delete="handleDeleteSelected"
            @moved="handleSelectionMoved"
        />
    </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'
import type { TrashMoveResult } from '~~/shared/types/trash'
import { getItemIcon, getItemName, getItemType, getItemId, getItemActions } from '~/utils/favorite'
import { getFileIcon, formatFileSize, formatFileTime } from '~/utils/file'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()
const { removeFavorite } = useFavoriteActions()
const { notifyTrashed } = useTrashActions()
const fileActions = useFileActions()
const folderActions = useFolderActions()
const noteActions = useNoteActions()
const { favorites, pending, error, fetchAll } = useUser()

type FavoriteItem = (typeof favorites.value)[number]

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('grid')
const activeCategory = ref('All')
const filterOptions = ['All', 'Files', 'Folders', 'Notes'] as const
const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')
const isRemoving = ref(false)
const isBulkDeleting = ref(false)

const busy = computed(() => {
    return (
        pending.value ||
        isRemoving.value ||
        isBulkDeleting.value ||
        fileActions.isLoading.value ||
        folderActions.isLoading.value ||
        noteActions.isLoading.value
    )
})

const isInitialLoading = computed(() => pending.value && favorites.value.length === 0)

const filteredFavorites = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const categories = { file: 'Files', folder: 'Folders', note: 'Notes' }

    return favorites.value.filter(item => {
        const category = categories[getItemType(item)]
        const matchesCategory = activeCategory.value === 'All' || activeCategory.value === category
        const matchesSearch = getItemName(item).toLowerCase().includes(query)

        return matchesCategory && matchesSearch
    })
})

const emptyTitle = computed(() => {
    if (error.value) return 'Unable to load favorites'
    if (favorites.value.length) return 'No matching favorites'

    return 'No favorites yet'
})

const emptyDescription = computed(() => {
    if (error.value) return error.value
    if (favorites.value.length) return 'Try a different search or filter.'

    return 'Your favorite files, folders and notes will appear here.'
})

const { sortedItems: sortedFavorites } = useSort(
    filteredFavorites,
    sortMode,
    item => getItemName(item),
    item => item.created_at
)

const itemsPerPage = computed(() => (viewMode.value === 'list' ? 12 : 24))
const { currentPage, totalPages, paginatedItems } = usePagination(sortedFavorites, itemsPerPage)
const {
    selectedItems: selectedFavorites,
    allSelected,
    toggleSelectAll
} = useSelection(paginatedItems)

const partiallySelected = computed(() => {
    return (
        !allSelected.value &&
        paginatedItems.value.some(item => selectedFavorites.value.includes(item.id))
    )
})

const selectionItems = computed(() => {
    return favorites.value
        .filter(item => selectedFavorites.value.includes(item.id))
        .map(item => ({ id: getItemId(item), type: getItemType(item) }))
})

const menus = new Map<string, InstanceType<typeof ItemMenu>>()

const setMenuRef = (id: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) {
        menus.set(id, menu as InstanceType<typeof ItemMenu>)
    } else {
        menus.delete(id)
    }
}

const openContextMenu = (event: MouseEvent, id: string) => {
    if (busy.value) return

    menus.get(id)?.openAt(event.clientX, event.clientY)
}

const itemIcon = (item: FavoriteItem) => {
    if (item.files) {
        return getFileIcon(item.files.mime_type, item.files.original_name)
    }

    return getItemIcon(item)
}

const hasMediaPreview = (item: FavoriteItem) => {
    const mimeType = item.files?.mime_type

    return Boolean(mimeType?.startsWith('image/') || mimeType?.startsWith('video/'))
}

const getItemSize = (item: FavoriteItem) => {
    const size = item.files?.size ?? item.notes?.size

    return size == null ? '-' : formatFileSize(size)
}

const itemPath = (item: FavoriteItem) => {
    const routes = { file: 'files', folder: 'folders', note: 'notes' }

    return `/${routes[getItemType(item)]}/${getItemId(item)}`
}

const openItem = (item: FavoriteItem) => {
    return navigateTo({ path: itemPath(item), query: { from: '/favorites' } })
}

const renameItem = (item: FavoriteItem) => {
    return navigateTo({ path: itemPath(item), query: { from: '/favorites', tab: 'edit' } })
}

const handleRemove = async (item: FavoriteItem) => {
    if (busy.value) return

    isRemoving.value = true

    try {
        await removeFavorite(getItemId(item), getItemType(item))
        await fetchAll()

        if (error.value) throw new Error(error.value)

        openToast('Removed from favorites.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not remove from favorites.', 'error')
    } finally {
        isRemoving.value = false
    }
}

const handleDownload = async (item: FavoriteItem) => {
    try {
        const type = getItemType(item)
        const id = getItemId(item)

        if (type === 'file') {
            await fileActions.downloadFile(id)
        } else if (type === 'folder') {
            folderActions.downloadFolder(id)
        } else {
            const link = document.createElement('a')
            link.href = `/api/notes/${encodeURIComponent(id)}/download`
            link.download = ''

            document.body.appendChild(link)
            link.click()
            link.remove()
        }
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Item could not be downloaded.', 'error')
    }
}

const handleDelete = async (item: FavoriteItem) => {
    if (busy.value) return

    try {
        const type = getItemType(item)
        const id = getItemId(item)

        if (type === 'file') {
            await fileActions.deleteFile(id)
        } else if (type === 'folder') {
            await folderActions.deleteFolder(id)
        } else {
            await noteActions.deleteNote(id)
        }
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not move item to Trash.', 'error')
    }
}

const handleDeleteSelected = async () => {
    if (busy.value || !selectionItems.value.length) return

    isBulkDeleting.value = true

    const selected = [...selectionItems.value]
    const combined: TrashMoveResult = { success: true, deletedIds: [], failedIds: [], trashIds: [] }
    const deleteActions = {
        file: fileActions.deleteFiles,
        note: noteActions.deleteNotes,
        folder: folderActions.deleteFolders
    }

    try {
        // Delete selected children before folders so overlapping selections remain valid.
        for (const type of ['file', 'note', 'folder'] as const) {
            const ids = selected.filter(item => item.type === type).map(item => item.id)

            if (!ids.length) continue

            try {
                const result = await deleteActions[type](ids, { notify: false })
                combined.deletedIds.push(...result.deletedIds)
                combined.failedIds.push(...result.failedIds)
                combined.trashIds.push(...result.trashIds)
            } catch {
                combined.failedIds.push(...ids)
            }
        }

        notifyTrashed(combined, undefined, true)

        if (combined.failedIds.length) {
            openToast(`${combined.failedIds.length} items could not be moved to Trash.`, 'error')
        }
    } finally {
        isBulkDeleting.value = false
    }
}

const handleSelectionMoved = async () => {
    selectedFavorites.value = []
    await fetchAll()

    if (error.value) openToast(error.value, 'error')
}

watch(favorites, items => {
    const availableIds = new Set(items.map(item => item.id))
    selectedFavorites.value = selectedFavorites.value.filter(id => availableIds.has(id))
})

watch(totalPages, total => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, activeCategory, viewMode, sortMode], () => {
    currentPage.value = 1
})
</script>

<style scoped>
.favorites-page {
    width: 100%;
    flex: 1;
    min-height: 0;

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
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
}

.favorites-toolbar :deep(.search-box) {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 32rem;
    box-sizing: border-box;
}

.toolbar-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
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

.favorites-table th:nth-child(2),
.favorites-table td:nth-child(2) {
    width: 42%;
}

.favorite-checkbox {
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

.favorite-checkbox:hover:not(:disabled) {
    border-color: #8b7cff;
}

.favorite-checkbox:checked,
.favorite-checkbox:indeterminate {
    background: #3c47be;
    border-color: #5965ed;
}

.favorite-checkbox:checked::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.15rem;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.favorite-checkbox:indeterminate::after {
    content: '';
    width: 0.55rem;
    height: 2px;
    margin: 0;
    background: #ffffff;
    border: 0;
    transform: none;
}

.favorite-checkbox:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.favorite-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.name-header {
    display: flex;
    align-items: center;

    gap: 0.3rem;
}

.sort-icon {
    font-size: 1rem;
}

.favorite-name {
    display: flex;
    align-items: center;

    gap: 0.75rem;
}

.favorite-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #9c8cff;
    background: #29215c;

    border: 1px solid #443b82;
    border-radius: 6px;

    font-size: 1.2rem;
}

.favorite-info {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 0.25rem;
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

.table-scroll {
    overflow-x: auto;
}

.favorites-table {
    min-width: 44rem;
    table-layout: fixed;
}

.favorites-table tbody tr.selected {
    background: #201d2d;
}

.favorite-info strong,
.favorite-info span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 800px) {
    .favorites-toolbar :deep(.search-box) {
        flex-basis: 100%;
        max-width: none;
    }
}

.favorites-subtoolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.favorite-type {
    text-transform: capitalize;
}

.favorite-name {
    min-width: 0;
}

.favorite-icon.file {
    color: #8b7cff;
    background: #252543;
    border-color: #3a3a64;
}

.favorite-icon.folder {
    color: #63a8ff;
    background: #1c2d49;
    border-color: #345580;
}

.video-play-icon {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 2.5rem;
    pointer-events: none;
}
</style>
