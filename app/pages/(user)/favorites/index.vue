<template>
    <div class="favorites-page w-full flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden">
        <div class="favorites-header flex flex-col shrink-0 p-0 gap-3 mb-3">
            <div class="favorites-toolbar flex items-center justify-between flex-wrap gap-2 min-w-0">
                <SearchBox class="[flex:1_1_18rem] min-w-0 max-w-128 max-tablet:basis-full max-tablet:max-w-none"
                    v-model="searchQuery"
                    placeholder="Search favorites..."
                />

                <div class="toolbar-actions flex items-center flex-wrap gap-2 min-w-0">
                    <ViewSwitcher v-model="viewMode" />
                </div>
            </div>

            <div class="favorites-subtoolbar flex items-center justify-between flex-wrap gap-2">
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
                <div class="loading-state text-label text-[0.85rem]">Loading favorites...</div>
            </template>

            <template
                v-if="!isInitialLoading && filteredFavorites.length === 0"
                #empty
            >
                <div class="empty-state w-full min-h-48 py-8 px-4 flex flex-col items-center justify-center gap-2 text-center">
                    <Icon
                        name="solar:star-bold"
                        class="empty-state-icon block shrink-0 mb-2 text-accent text-[2.5rem]"
                    />
                    <strong class="text-[#f5f5f5] text-sm font-semibold leading-normal">{{ emptyTitle }}</strong>
                    <span class="empty-state-description text-muted text-sm font-normal leading-normal">{{ emptyDescription }}</span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                    <table class="favorites-table w-full border-separate border-spacing-0 bg-transparent border-0 min-w-176 table-fixed">
                        <thead>
                            <tr>
                                <th class="w-14 pl-4 pr-3 text-center file-table-heading" scope="col">
                                    <input
                                        type="checkbox"
                                        class="favorite-checkbox file-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="busy"
                                        @change="toggleSelectAll"
                                    />
                                </th>
                                <th class="w-[42%] file-table-heading" scope="col">
                                    <div class="name-header flex items-center gap-[0.3rem]">
                                        Name
                                        <Icon
                                            name="solar:sort-vertical-linear"
                                            class="sort-icon text-base leading-[inherit]"
                                        />
                                    </div>
                                </th>
                                <th class="file-table-heading" scope="col">Type</th>
                                <th class="file-table-heading" scope="col">Size</th>
                                <th class="file-table-heading" scope="col">Added</th>
                                <th class="file-table-heading" scope="col">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr class="hover:bg-surface-hover selected:bg-[#201d2d]"
                                v-for="item in paginatedItems"
                                :key="item.id"
                                :class="{ selected: selectedFavorites.includes(item.id) }"
                                @dblclick="openItem(item)"
                                @contextmenu.prevent.stop="openContextMenu($event, item.id)"
                            >
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] w-14 pl-4 pr-3 text-center file-table-cell" @dblclick.stop>
                                    <input
                                        v-model="selectedFavorites"
                                        type="checkbox"
                                        class="favorite-checkbox file-checkbox"
                                        :value="item.id"
                                        :disabled="busy"
                                    />
                                </td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] w-[42%] file-table-cell">
                                    <div class="favorite-name flex items-center gap-3 min-w-0">
                                        <div
                                            class="favorite-icon flex items-center justify-center shrink-0 text-[#9c8cff] bg-[#29215c] border
                                            border-[#443b82] rounded-md text-[1.2rem] is-file:text-accent is-file:bg-[#252543]
                                            is-file:border-[#3a3a64] is-folder:text-[#63a8ff] is-folder:bg-[#1c2d49] is-folder:border-[#345580]
                                            size-10"
                                            :class="getItemType(item)"
                                        >
                                            <Icon :name="itemIcon(item)" />
                                        </div>
                                        <div class="favorite-info min-w-0 flex flex-col gap-1">
                                            <strong class="text-white text-sm font-semibold whitespace-nowrap leading-normal overflow-hidden text-ellipsis" :title="getItemName(item)">{{
                                                getItemName(item)
                                            }}</strong>
                                            <span class="text-muted text-xs whitespace-nowrap font-normal leading-normal overflow-hidden text-ellipsis"
                                                >{{ getItemSize(item) }} ·
                                                {{ formatFileTime(item.created_at) }}</span
                                            >
                                        </div>
                                    </div>
                                </td>
                                <td class="favorite-type h-[4.2rem] text-secondary text-[0.85rem] capitalize file-table-cell">{{ getItemType(item) }}</td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ getItemSize(item) }}</td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ formatFileTime(item.created_at) }}</td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell"
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
                                class="file-preview-image object-cover block transition-transform duration-250 ease-[ease]
                                group-hover/file-card:scale-[1.035] size-full"
                            />
                            <template v-else>
                                <div class="video-play-icon absolute inset-0 z-1 grid place-items-center text-white text-[2.5rem]
                                    pointer-events-none"><Icon name="solar:play-bold" /></div>
                                <video
                                    :src="`/api/files/${item.file_id}/preview`"
                                    class="file-preview-image object-cover block transition-transform duration-250 ease-[ease]
                                    group-hover/file-card:scale-[1.035] size-full"
                                    preload="metadata"
                                    muted
                                    playsinline
                                />
                            </template>
                        </template>

                        <template #actions>
                            <label class="file-select flex items-center justify-center bg-[#36363ee6] border border-[#3a3a42] rounded-full
                                cursor-pointer size-8">
                                <input
                                    v-model="selectedFavorites"
                                    type="checkbox"
                                    class="favorite-checkbox file-checkbox m-0 accent-[#7063d8] cursor-pointer size-[1.1rem]"
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
                            <span class="favorite-type min-w-0 overflow-hidden text-ellipsis whitespace-nowrap capitalize first:shrink-0">{{ getItemType(item) }}</span>
                            ·
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">{{ getItemSize(item) }}</span>
                            ·
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">{{ formatFileTime(item.created_at) }}</span>
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
