<template>
    <div class="folders-page w-full flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden">
        <div class="folders-header flex flex-col shrink-0 p-0 gap-3 mb-3">
            <div class="folders-toolbar flex flex-row items-center justify-between gap-2 flex-wrap min-w-0">
                <SearchBox class="max-tablet:w-full max-tablet:min-w-0 max-tablet:box-border"
                    v-model="searchQuery"
                    placeholder="Search folders..."
                />

                <div class="toolbar-actions flex flex-row items-center gap-2 flex-wrap min-w-0">
                    <SortDropdown v-model="sortMode" />
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton
                        text="Upload"
                        mode="folder"
                        @folder="handleFolders"
                    />

                    <button
                        type="button"
                        class="new-folder-button inline-flex items-center justify-center shrink-0 gap-2 h-control py-0 px-3.5
                        text-white bg-primary border border-primary rounded-control
                        shadow-[inset_0_1px_0_#ffffff12,_0_2px_6px_#0003] text-control-size font-medium leading-normal
                        whitespace-nowrap cursor-pointer transition-[background,border-color,transform] duration-180
                        ease-[ease] hover:enabled:bg-primary/85 hover:enabled:border-accent hover:enabled:-translate-y-px
                        active:enabled:bg-primary/85 active:enabled:translate-y-0
                        active:enabled:shadow-[inset_0_1px_3px_#0003] focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:-outline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                        motion-reduce:transition-none motion-reduce:hover:enabled:translate-y-0"
                        :disabled="pending || folderActions.isLoading.value"
                        @click="createFolder"
                    >
                        <Icon
                            name="solar:add-folder-bold"
                            class="new-folder-icon block shrink-0 text-white text-control-icon size-control-icon"
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
                <div class="loading-state text-label text-[0.85rem] flex flex-col items-center gap-[0.8rem]">
                    <span class="loading-spinner border-3 border-divider border-t-primary rounded-full animate-spin
                        [animation-duration:0.8s] motion-reduce:animate-none size-8" />
                    <span>Loading folders...</span>
                </div>
            </template>

            <template
                v-if="!pending && filteredFolders.length === 0"
                #empty
            >
                <div class="empty-state w-full min-h-48 py-8 px-4 flex flex-col items-center justify-center gap-2 text-center">
                    <Icon
                        name="solar:folder-linear"
                        size="2.5rem"
                        class="empty-state-icon empty-state-folder-icon block shrink-0 mb-2 text-accent text-[2.5rem]"
                    />
                    <strong class="text-[#f5f5f5] text-sm font-semibold leading-normal">{{ folders.length ? 'No matching folders' : 'No folders yet' }}</strong>
                    <span class="empty-state-description text-muted text-sm font-normal leading-normal">
                        {{
                            folders.length
                                ? 'Try a different search.'
                                : 'Create your first folder to organize your files.'
                        }}
                    </span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                    <table class="folders-table w-full border-separate border-spacing-0 bg-transparent border-0 rounded-none min-w-176
                        table-fixed">
                        <thead>
                            <tr>
                                <th class="w-14 pl-4 pr-3 text-center file-table-heading">
                                    <input
                                        type="checkbox"
                                        class="folder-checkbox file-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="pending"
                                        @change="toggleSelectAll"
                                    />
                                </th>

                                <th class="w-[42%] file-table-heading">
                                    <div class="name-header flex items-center gap-[0.3rem]">
                                        Name
                                        <Icon
                                            name="solar:sort-vertical-linear"
                                            class="sort-icon text-base leading-[inherit]"
                                        />
                                    </div>
                                </th>

                                <th class="file-table-heading">Type</th>
                                <th class="file-table-heading">Created</th>
                                <th class="file-table-heading">Modified</th>
                                <th class="file-table-heading">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr class="hover:bg-surface-hover selected:bg-accent/8"
                                v-for="folder in paginatedFolders"
                                :key="folder.id"
                                :class="{ selected: selectedFolders.includes(folder.id) }"
                                @click="openFolder(folder)"
                                @contextmenu.prevent.stop="openContextMenu($event, folder.id)"
                            >
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] w-14 pl-4 pr-3 text-center file-table-cell" @click.stop>
                                    <input
                                        v-model="selectedFolders"
                                        type="checkbox"
                                        class="folder-checkbox file-checkbox"
                                        :value="folder.id"
                                        :disabled="pending"
                                    />
                                </td>

                                <td class="h-[4.2rem] text-secondary text-[0.85rem] w-[42%] file-table-cell">
                                    <div class="folder-name flex items-center gap-3">
                                        <div class="folder-icon flex items-center justify-center shrink-0 text-white bg-primary border border-primary
                                            rounded-md text-[1.2rem] size-10">
                                            <Icon name="solar:folder-bold" />
                                        </div>

                                        <div class="folder-info flex flex-col gap-1 min-w-0">
                                            <strong class="text-white text-sm font-semibold whitespace-nowrap leading-normal overflow-hidden text-ellipsis" :title="folder.name">{{ folder.name }}</strong>
                                            <span class="text-muted text-xs whitespace-nowrap font-normal leading-normal overflow-hidden text-ellipsis">
                                                Folder • {{ formatFileTime(folder.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">Folder</td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ formatFileTime(folder.created_at) }}</td>
                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ formatFileTime(folder.updated_at) }}</td>

                                <td class="h-[4.2rem] text-secondary text-[0.85rem] file-table-cell" @click.stop>
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
                            <label class="file-select flex items-center justify-center bg-[#36363ee6] border border-[#3a3a42] rounded-full
                                cursor-pointer size-8">
                                <input
                                    v-model="selectedFolders"
                                    type="checkbox"
                                    class="folder-checkbox file-checkbox m-0 accent-[#7063d8] cursor-pointer size-[1.1rem]"
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
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">Folder</span>
                            ·
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">{{ formatFileTime(folder.created_at) }}</span>
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
const { itemsPerPage } = useBrowsePreferences(viewMode, sortMode)

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
