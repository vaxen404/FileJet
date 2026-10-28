<template>
    <div class="trash-page flex w-full min-h-0 flex-1 flex-col overflow-hidden">
        <div class="mb-3 flex shrink-0 flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <SearchBox
                    v-model="searchQuery"
                    class="min-w-0 max-w-128 [flex:1_1_18rem] max-tablet:max-w-none"
                    placeholder="Search trash..."
                    aria-label="Search trash"
                />
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" :class="buttonClass" :disabled="busy || !entries.length" @click="restoreItems(entries)">
                        <Icon name="solar:restart-linear" class="text-control-icon" />
                        Restore all
                    </button>
                    <button type="button" :class="dangerButtonClass" :disabled="busy || !entries.length" @click="requestDelete(entries, true)">
                        <Icon name="solar:trash-bin-trash-linear" class="text-control-icon" />
                        Empty trash
                    </button>
                </div>
            </div>

            <div class="flex items-start gap-3 rounded-xl border border-divider bg-surface px-4 py-3">
                <Icon name="solar:info-circle-linear" class="mt-0.5 shrink-0 text-lg text-accent" />
                <p class="m-0 text-sm leading-relaxed text-label">
                    Restore items to their original location or delete them permanently to free up storage.
                    Restoring or deleting a folder also includes its contents.
                </p>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <ItemFilters v-model="activeCategory" :options="filterOptions" />
                <SortDropdown v-model="sortMode" />
            </div>
        </div>

        <DataView view-mode="list" :is-loading="isLoading">
            <template #loading>
                <div role="status" class="flex items-center gap-2 text-sm text-label">
                    <Icon name="solar:refresh-linear" class="animate-spin text-lg" />
                    Loading trash...
                </div>
            </template>

            <template v-if="!isLoading && (loadError || !filteredItems.length)" #empty>
                <div class="flex min-h-48 w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <Icon :name="loadError ? 'solar:danger-triangle-linear' : 'solar:trash-bin-trash-linear'" class="mb-2 text-[2.5rem] text-accent" />
                    <strong class="text-sm font-semibold text-foreground">{{ emptyTitle }}</strong>
                    <p class="m-0 max-w-96 text-sm leading-relaxed text-muted">{{ emptyDescription }}</p>
                    <button v-if="loadError" type="button" :class="buttonClass" class="mt-3" @click="loadTrash">Try again</button>
                    <button v-else-if="entries.length" type="button" :class="buttonClass" class="mt-3" @click="clearFilters">Clear filters</button>
                    <NuxtLink v-else to="/files" :class="buttonClass" class="mt-3 no-underline">Go to files</NuxtLink>
                </div>
            </template>

            <template #list>
                <div class="min-h-0 flex-1 overflow-auto">
                    <table class="mobile-item-table trash-table w-full min-w-200 table-fixed border-separate border-spacing-0">
                        <caption class="sr-only">Deleted files, folders and notes</caption>
                        <thead>
                            <tr>
                                <th scope="col" class="file-table-heading w-14">
                                    <input type="checkbox" class="file-checkbox" aria-label="Select all items on this page" :checked="allSelected" :indeterminate="partiallySelected" :disabled="busy" @change="toggleSelectAll" />
                                </th>
                                <th scope="col" class="file-table-heading w-[32%]">Name</th>
                                <th scope="col" class="file-table-heading">Original location</th>
                                <th scope="col" class="file-table-heading w-24">Size</th>
                                <th scope="col" class="file-table-heading w-32">Deleted</th>
                                <th scope="col" class="file-table-heading w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in paginatedItems" :key="item.id" class="hover:bg-surface-hover selected:bg-accent/8" :class="{ selected: selectedItems.includes(item.id) }">
                                <td class="item-selection-cell file-table-cell h-[4.2rem]">
                                    <input v-model="selectedItems" type="checkbox" class="file-checkbox" :value="item.id" :aria-label="`Select ${itemName(item)}`" :disabled="busy" />
                                </td>
                                <td class="item-name-cell file-table-cell h-[4.2rem]">
                                    <div class="flex min-w-0 items-center gap-3">
                                        <div class="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/12 text-xl text-accent">
                                            <Icon :name="itemIcon(item)" />
                                        </div>
                                        <div class="flex min-w-0 flex-col gap-1">
                                            <strong class="truncate text-sm font-semibold text-foreground" :title="itemName(item)">{{ itemName(item) }}</strong>
                                            <span class="truncate text-xs text-muted">{{ itemDescription(item) }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Location" class="item-meta-cell file-table-cell truncate text-sm text-secondary" :title="originalLocation(item)">{{ originalLocation(item) }}</td>
                                <td data-label="Size" class="item-meta-cell file-table-cell text-sm text-secondary">{{ itemSize(item) }}</td>
                                <td data-label="Deleted" class="item-meta-cell file-table-cell text-sm text-secondary" :title="item.deleted_at">{{ formatFileTime(item.deleted_at) }}</td>
                                <td class="item-actions-cell file-table-cell">
                                    <div class="flex items-center gap-1">
                                        <button type="button" :class="iconButtonClass" :disabled="busy" :aria-label="`Restore ${itemName(item)}`" title="Restore" @click="restoreItems([item])">
                                            <Icon name="solar:restart-linear" class="text-lg" />
                                        </button>
                                        <button type="button" :class="iconButtonClass" class="text-danger hover:enabled:bg-danger-surface" :disabled="busy" :aria-label="`Permanently delete ${itemName(item)}`" title="Delete permanently" @click="requestDelete([item])">
                                            <Icon name="solar:trash-bin-trash-linear" class="text-lg" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </DataView>

        <Pagination v-if="!isLoading && !loadError" v-model="currentPage" :total-pages="totalPages" />

        <Transition name="dock">
            <div v-if="selectedItems.length" role="region" aria-label="Selected trash items" class="selection-region mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-divider bg-surface p-3">
                <span class="mr-2 text-sm text-foreground" aria-live="polite">{{ selectedItems.length }} selected</span>
                <button type="button" :class="buttonClass" :disabled="busy" @click="restoreItems(selectedEntries)">
                    <Icon name="solar:restart-linear" /> Restore
                </button>
                <button type="button" :class="dangerButtonClass" :disabled="busy" @click="requestDelete(selectedEntries)">
                    <Icon name="solar:trash-bin-trash-linear" /> Delete permanently
                </button>
                <button type="button" :class="buttonClass" :disabled="busy" @click="selectedItems = []">Deselect all</button>
            </div>

        </Transition>

        <div v-if="isWorking" role="status" class="mt-2 shrink-0 text-center text-xs text-label">{{ operation === 'restore' ? 'Restoring items...' : 'Deleting items permanently...' }}</div>

        <ConfirmModal
            :show="deleteTargets.length > 0"
            :title="emptyingTrash ? 'Empty trash?' : 'Delete permanently?'"
            :message="deleteMessage"
            :confirm-text="emptyingTrash ? 'Empty trash' : 'Delete permanently'"
            @cancel="deleteTargets = []"
            @confirm="deleteItems"
        />
    </div>
</template>

<script setup lang="ts">
import { formatFileSize, formatFileTime, getFileIcon } from '~/utils/file'

definePageMeta({ middleware: 'auth', layout: 'user' })

const { trash, folders, error, fetchTrash, fetchFolders, syncTrash, fetchUser } = useUser()
const { openToast } = useToast()
type TrashItem = (typeof trash.value)[number]

const buttonClass = 'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-control-border bg-control px-3 text-control-size font-medium text-secondary cursor-pointer hover:enabled:bg-raised hover:enabled:text-foreground disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const dangerButtonClass = `${buttonClass} text-danger hover:enabled:bg-danger-surface hover:enabled:text-danger-hover`
const iconButtonClass = 'inline-flex size-9 shrink-0 items-center justify-center rounded-control border-0 bg-transparent text-accent cursor-pointer hover:enabled:bg-raised disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-accent'

const searchQuery = ref('')
const activeCategory = ref('All')
const filterOptions = ['All', 'Files', 'Folders', 'Notes'] as const
const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')
const isLoading = ref(true)
const isWorking = ref(false)
const operation = ref<'restore' | 'delete'>('restore')
const loadError = ref<string | null>(null)
const deleteTargets = ref<TrashItem[]>([])
const emptyingTrash = ref(false)
const busy = computed(() => isLoading.value || isWorking.value || Boolean(loadError.value) || deleteTargets.value.length > 0)

const itemName = (item: TrashItem) => item.original_name || item.name || 'Untitled'
const itemIcon = (item: TrashItem) => item.item_type === 'folder'
    ? 'solar:folder-bold'
    : item.item_type === 'note' ? 'solar:document-text-bold' : getFileIcon(item.mime_type, itemName(item))

const entries = computed(() => {
    const folderIds = new Set(trash.value.filter(item => item.item_type === 'folder').map(item => item.item_id))
    return trash.value.filter(item => !item.root_folder_id || item.root_folder_id === item.item_id || !folderIds.has(item.root_folder_id))
})
const folderContents = (item: TrashItem) => item.item_type === 'folder'
    ? trash.value.filter(child => child.root_folder_id === item.item_id && child.id !== item.id)
    : []
const itemDescription = (item: TrashItem) => {
    if (item.item_type !== 'folder') return item.item_type === 'note' ? 'Note' : 'File'
    const count = folderContents(item).length
    return count ? `Folder · ${count} ${count === 1 ? 'item' : 'items'} inside` : 'Folder'
}
const itemSize = (item: TrashItem) => {
    if (item.item_type !== 'folder') return item.size === null ? '—' : formatFileSize(item.size)
    return formatFileSize(folderContents(item).reduce((size, child) => size + Number(child.size ?? 0), 0))
}
const originalLocation = (item: TrashItem) => {
    let parentId = item.item_type === 'folder' ? item.parent_folder_id : item.folder_id
    const parts: string[] = []
    const visited = new Set<string>()
    while (parentId && !visited.has(parentId)) {
        visited.add(parentId)
        const folder = folders.value.find(folder => folder.id === parentId)
        const deletedFolder = trash.value.find(folder => folder.item_type === 'folder' && folder.item_id === parentId)
        if (!folder && !deletedFolder) {
            parts.unshift('Deleted folder')
            break
        }
        parts.unshift(folder?.name || deletedFolder?.name || 'Untitled folder')
        parentId = folder ? folder.parent_folder_id : deletedFolder!.parent_folder_id
    }
    return parts.length ? parts.join(' / ') : 'My files'
}

const filteredItems = computed(() => {
    const categories: Record<string, string> = { file: 'Files', folder: 'Folders', note: 'Notes' }
    const query = searchQuery.value.trim().toLowerCase()
    return entries.value.filter(item =>
        (activeCategory.value === 'All' || categories[item.item_type] === activeCategory.value) &&
        itemName(item).toLowerCase().includes(query)
    )
})
const { sortedItems } = useSort(filteredItems, sortMode, itemName, item => item.deleted_at)
const { currentPage, totalPages, paginatedItems } = usePagination(sortedItems, ref(12))
const { selectedItems, allSelected, toggleSelectAll } = useSelection(paginatedItems)
const selectedEntries = computed(() => entries.value.filter(item => selectedItems.value.includes(item.id)))
const partiallySelected = computed(() => !allSelected.value && paginatedItems.value.some(item => selectedItems.value.includes(item.id)))
const emptyTitle = computed(() => loadError.value ? 'Unable to load trash' : entries.value.length ? 'No matching items' : 'Your trash is empty')
const emptyDescription = computed(() => loadError.value || (entries.value.length ? 'Try a different search or filter.' : 'Deleted files, folders and notes will appear here.'))
const deleteMessage = computed(() => {
    const label = deleteTargets.value.length === 1 ? `"${itemName(deleteTargets.value[0]!)}"` : `${deleteTargets.value.length} items`
    return `Permanently delete ${emptyingTrash.value ? 'everything in your trash' : label}? Folder contents will also be deleted. This cannot be undone.`
})

const clearFilters = () => {
    searchQuery.value = ''
    activeCategory.value = 'All'
}
const loadTrash = async () => {
    if (isWorking.value) return
    isLoading.value = true
    error.value = null
    try {
        await Promise.all([fetchTrash(), fetchFolders()])
        loadError.value = error.value
    } finally {
        isLoading.value = false
    }
}

const requestDelete = (items: TrashItem[], empty = false) => {
    if (busy.value || !items.length) return
    emptyingTrash.value = empty
    deleteTargets.value = [...items]
}

const restoreOrder = (items: TrashItem[]) => {
    const deletedFolders = new Map(trash.value.filter(item => item.item_type === 'folder').map(item => [item.item_id, item]))
    const depth = (item: TrashItem) => {
        let parentId = item.item_type === 'folder' ? item.parent_folder_id : item.folder_id
        const visited = new Set<string>()
        while (parentId && deletedFolders.has(parentId) && !visited.has(parentId)) {
            visited.add(parentId)
            parentId = deletedFolders.get(parentId)!.parent_folder_id
        }
        return visited.size
    }
    // Separately deleted children may depend on a folder in an earlier batch.
    return [...items].sort((a, b) => depth(a) - depth(b))
}

const runOperation = async (items: TrashItem[], action: 'restore' | 'delete') => {
    if (isWorking.value || isLoading.value || !items.length) return
    isWorking.value = true
    operation.value = action
    let completed = false
    try {
        // Respect request limits and recheck targets after each cascading operation.
        const limit = action === 'restore' ? 200 : 50
        let remaining = action === 'restore' ? restoreOrder(items) : [...items]
        while (remaining.length) {
            const batch = remaining.slice(0, limit)
            let diskDeleted = true
            if (batch.length === 1) {
                const result = await $fetch<{ success: boolean; diskDeleted?: boolean }>(`/api/trash/${encodeURIComponent(batch[0]!.id)}`, { method: action === 'restore' ? 'PATCH' : 'DELETE' })
                diskDeleted = result.diskDeleted !== false
            } else {
                const result = await $fetch<{ success: boolean; diskDeleted?: boolean }>(`/api/trash/bulk-${action}`, { method: 'POST', body: { itemIds: batch.map(item => item.id) } })
                diskDeleted = result.diskDeleted !== false
            }
            if (!diskDeleted) openToast('Items were deleted, but some stored files could not be removed.', 'error')
            remaining = remaining.slice(batch.length)
            if (remaining.length) {
                error.value = null
                await fetchTrash()
                if (error.value) throw new Error('Items changed, but trash could not be refreshed. Please try again.')
                const availableIds = new Set(trash.value.map(item => item.id))
                remaining = remaining.filter(item => availableIds.has(item.id))
            }
        }
        completed = true
        selectedItems.value = []
        openToast(action === 'restore' ? 'Items restored successfully.' : 'Items permanently deleted.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'The operation could not be completed.', 'error')
    } finally {
        // Refresh even after a failed batch, since earlier batches may have succeeded.
        await syncTrash()
        if (action === 'delete') await fetchUser()
        if (error.value) openToast('Some data could not be refreshed. Please reload the page.', 'error')
        if (completed) loadError.value = null
        isWorking.value = false
    }
}
const restoreItems = (items: TrashItem[]) => {
    if (busy.value) return
    return runOperation([...items], 'restore')
}
const deleteItems = () => {
    const targets = [...deleteTargets.value]
    deleteTargets.value = []
    return runOperation(targets, 'delete')
}

watch(entries, items => {
    const ids = new Set(items.map(item => item.id))
    selectedItems.value = selectedItems.value.filter(id => ids.has(id))
})
watch(totalPages, total => { currentPage.value = Math.min(currentPage.value, Math.max(1, total)) })
watch([searchQuery, activeCategory, sortMode], () => {
    currentPage.value = 1
    selectedItems.value = []
})

await loadTrash()
</script>
