<template>
    <div class="shared-page flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div class="mb-3 flex shrink-0 flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <SearchBox v-model="searchQuery" placeholder="Search shared items..." aria-label="Search shared items" class="min-w-0 max-w-128 [flex:1_1_18rem] max-tablet:max-w-none" />
                <div class="flex items-center gap-3 max-mobile:w-full max-mobile:justify-between">
                    <span class="text-xs text-muted">{{ entries.length }} {{ entries.length === 1 ? 'link' : 'links' }}</span>
                    <button type="button" :disabled="busy" class="shared-button" @click="loadShares">
                        <Icon name="solar:refresh-linear" size="17" :class="{ 'animate-spin': isLoading }" />
                        Refresh
                    </button>
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
                <ItemFilters v-model="activeCategory" :options="filterOptions" />
                <div class="shared-status-controls flex min-w-0 flex-wrap items-center gap-2">
                    <select v-model="statusFilter" aria-label="Filter links by status" class="h-control cursor-pointer border border-divider bg-surface px-3 text-control-size text-label outline-none focus:border-accent">
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="unavailable">Unavailable</option>
                    </select>
                    <SortDropdown v-model="sortMode" class="ml-auto" />
                </div>
            </div>
        </div>

        <DataView view-mode="list" :is-loading="isLoading">
            <template #loading>
                <p role="status" class="flex items-center gap-2 text-sm text-label"><Icon name="solar:refresh-linear" class="animate-spin" />Loading shared items...</p>
            </template>
            <template v-if="!isLoading && (loadError || !filteredItems.length)" #empty>
                <div class="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
                    <Icon :name="loadError ? 'solar:danger-triangle-linear' : 'solar:share-circle-linear'" size="36" class="text-accent" />
                    <h2 class="text-sm font-semibold text-foreground">{{ loadError ? 'Could not load shared items' : entries.length ? 'No matching links' : 'No shared items' }}</h2>
                    <p class="max-w-96 text-sm leading-6 text-muted">{{ loadError || (entries.length ? 'Try another search or clear the filters.' : 'Create a share link from a file, folder, or note to see it here.') }}</p>
                    <button v-if="loadError" type="button" class="shared-button" @click="loadShares">Try again</button>
                    <button v-else-if="entries.length" type="button" class="shared-button" @click="clearFilters">Clear filters</button>
                    <NuxtLink v-else to="/files" class="shared-button no-underline">Go to files</NuxtLink>
                </div>
            </template>
            <template #list>
                <div class="min-h-0 flex-1 overflow-auto">
                    <table class="mobile-item-table shared-table w-full min-w-252 table-fixed border-separate border-spacing-0">
                        <caption class="sr-only">Your shared files, folders, and notes</caption>
                        <thead>
                            <tr>
                                <th scope="col" class="file-table-heading w-14">
                                    <input type="checkbox" class="file-checkbox" aria-label="Select all links on this page" :checked="allSelected" :indeterminate="partiallySelected" :disabled="busy" @change="toggleSelectAll">
                                </th>
                                <th scope="col" class="file-table-heading w-[27%]">Name</th>
                                <th scope="col" class="file-table-heading">Share link</th>
                                <th scope="col" class="file-table-heading w-32">Access</th>
                                <th scope="col" class="file-table-heading w-44">Expires</th>
                                <th scope="col" class="file-table-heading w-44 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in paginatedItems"
                                :key="item.id"
                                class="hover:bg-surface-hover selected:bg-accent/8"
                                :class="{ selected: selectedIds.includes(item.id), 'cursor-pointer': item.isAvailable && !busy }"
                                @click="openRowSettings($event, item)"
                                @contextmenu.prevent.stop="openContextMenu($event, item)"
                            >
                                <td class="item-selection-cell file-table-cell">
                                    <input v-model="selectedIds" type="checkbox" class="file-checkbox" :value="item.id" :disabled="busy" :aria-label="`Select share link for ${item.name}`">
                                </td>
                                <td class="item-name-cell file-table-cell h-19">
                                    <div class="flex min-w-0 items-center gap-3">
                                        <span class="grid size-10 shrink-0 place-items-center rounded-md border border-accent/25 bg-accent/12 text-xl text-accent"><Icon :name="itemIcon(item)" /></span>
                                        <div class="min-w-0">
                                            <button
                                                v-if="item.isAvailable"
                                                type="button"
                                                :disabled="busy"
                                                class="block max-w-full cursor-pointer truncate text-left text-sm font-semibold text-foreground hover:text-accent
                                                    disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"
                                                :title="item.name"
                                                :aria-label="`Open share settings for ${item.name}`"
                                                @click.stop="openShareSettings(item)"
                                            >{{ item.name }}</button>
                                            <span v-else class="block truncate text-sm font-semibold text-muted">{{ item.name }}</span>
                                            <span class="mt-1 block truncate text-xs text-muted">{{ typeLabels[item.itemType] }} · {{ formatDate(item.createdAt, false) }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Share link" class="item-meta-cell file-table-cell">
                                    <input :value="item.url" :aria-label="`Share link for ${item.name}`" readonly type="text" class="h-9 w-full min-w-0 border border-divider bg-canvas/60 px-3 text-xs text-label outline-none focus:border-accent" @focus="($event.target as HTMLInputElement).select()">
                                </td>
                                <td data-label="Access" class="item-meta-cell file-table-cell">
                                    <div class="flex items-center gap-2">
                                        <span class="rounded-md px-2 py-1 text-xs" :class="itemStatus(item) === 'active' ? 'bg-accent/10 text-accent' : itemStatus(item) === 'expired' ? 'bg-warning/10 text-warning' : 'bg-control text-muted'">{{ statusLabels[itemStatus(item)] }}</span>
                                        <Icon v-if="item.hasPassword" name="solar:lock-password-linear" size="16" class="shrink-0 text-muted" title="Password protected" aria-label="Password protected" />
                                    </div>
                                </td>
                                <td data-label="Expires" class="item-meta-cell file-table-cell text-xs text-label" :title="item.expiresAt ? `${item.expiresAt} (UTC)` : 'No expiration'">{{ item.expiresAt ? formatDate(item.expiresAt) : 'Never' }}</td>
                                <td class="item-actions-cell file-table-cell">
                                    <div class="flex items-center justify-end gap-1">
                                        <button type="button" :disabled="busy || !item.isAvailable" :aria-label="`Copy link for ${item.name}`" title="Copy link" class="shared-icon" @click="copyLink(item)"><Icon name="solar:copy-linear" size="18" /></button>
                                        <a v-if="item.isAvailable" :href="item.url" target="_blank" rel="noopener noreferrer" :aria-label="`Open public link for ${item.name}`" title="Open public link" class="shared-icon"><Icon name="solar:arrow-right-up-linear" size="18" /></a>
                                        <span v-else class="shared-icon pointer-events-none opacity-35" aria-hidden="true"><Icon name="solar:arrow-right-up-linear" size="18" /></span>
                                        <button type="button" :disabled="busy || !item.isAvailable" :aria-label="`Share settings for ${item.name}`" title="Share settings" class="shared-icon" @click="openShareSettings(item)"><Icon name="solar:tuning-2-linear" size="18" /></button>
                                        <button type="button" :disabled="busy" :aria-label="`Remove share link for ${item.name}`" title="Remove link" class="shared-icon text-danger! hover:enabled:bg-danger/10!" @click="removeLink(item)"><Icon :name="removingId === item.id ? 'solar:refresh-linear' : 'solar:link-broken-linear'" size="18" :class="{ 'animate-spin': removingId === item.id }" /></button>
                                        <ItemMenu
                                            :ref="menu => setShareMenuRef(item.id, menu)"
                                            :type="item.itemType"
                                            :actions="[]"
                                            :custom-actions="shareMenuActions(item)"
                                            :disabled="busy"
                                            context-only
                                            @custom-action="handleMenuAction($event, item)"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </DataView>

        <Pagination v-if="!loadError && !isLoading && filteredItems.length" v-model="currentPage" :total-pages="totalPages" />
        <Transition name="dock">
            <div v-if="selectedEntries.length" role="region" aria-label="Selected share links" class="selection-region mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-surface px-4 py-3">
                <span class="text-sm text-secondary" aria-live="polite">{{ selectedEntries.length }} selected</span>
                <div class="flex items-center gap-2">
                    <button type="button" :disabled="busy" class="shared-button" @click="selectedIds = []">Deselect all</button>
                    <button type="button" :disabled="busy" class="shared-button text-danger! hover:enabled:bg-danger/10!" @click="removeSelected">
                        <Icon :name="bulkRemoving ? 'solar:refresh-linear' : 'solar:link-broken-linear'" size="17" :class="{ 'animate-spin': bulkRemoving }" />
                        {{ bulkRemoving ? 'Removing...' : selectedEntries.length === 1 ? 'Remove link' : 'Remove links' }}
                    </button>
                </div>
            </div>
        </Transition>
        <ShareSettingsModal :item="settingsItem" v-model:saving="settingsSaving" @close="settingsItem = null" @changed="shareChanged" />
    </div>
</template>

<script setup lang="ts">
import type { SharedListItem, ShareState } from '~~/shared/types/share'
import { getFileIcon } from '~/utils/file'
import type ItemMenu from '~/components/ui/ItemMenu.vue'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

useHead({ title: 'Shared · FileJet' })

const { openToast } = useToast()
const { confirm } = useConfirm()
const { preferences } = usePreferences()
const requestFetch = useRequestFetch()
const entries = ref<SharedListItem[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const searchQuery = ref('')
const activeCategory = ref('All')
const filterOptions = ['All', 'Files', 'Folders', 'Notes'] as const
const statusFilter = ref('all')
const sortMode = ref(preferences.value.defaultSort)
const removingId = ref<string | null>(null)
const bulkRemoving = ref(false)
const selectedIds = ref<string[]>([])
const selectedEntries = computed(() => entries.value.filter(item => selectedIds.value.includes(item.id)))
const settingsItem = ref<SharedListItem | null>(null)
const settingsSaving = ref(false)
const busy = computed(() => isLoading.value || removingId.value !== null || bulkRemoving.value || settingsSaving.value)
const shareMenus = new Map<string, InstanceType<typeof ItemMenu>>()

const setShareMenuRef = (id: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) shareMenus.set(id, menu as InstanceType<typeof ItemMenu>)
    else shareMenus.delete(id)
}

const openShareSettings = (item: SharedListItem) => {
    if (!busy.value && item.isAvailable) settingsItem.value = item
}

const openRowSettings = (event: MouseEvent, item: SharedListItem) => {
    if ((event.target as HTMLElement | null)?.closest('a, button, input, select, textarea, label')) return
    openShareSettings(item)
}

const openContextMenu = (event: MouseEvent, item: SharedListItem) => {
    if (busy.value) return
    shareMenus.get(item.id)?.openAt(event.clientX, event.clientY)
}

const shareMenuActions = (item: SharedListItem) => [
    { id: 'share', label: 'Share settings / QR code', icon: 'solar:qr-code-linear', disabled: !item.isAvailable },
    { id: 'copy', label: 'Copy link', icon: 'solar:copy-linear', disabled: !item.isAvailable },
    { id: 'public', label: 'Open public link', icon: 'solar:arrow-right-up-linear', href: item.url, disabled: !item.isAvailable },
    { id: 'open', label: 'Open original item', icon: 'solar:document-linear', disabled: !item.isAvailable },
    { id: 'remove', label: 'Remove link', icon: 'solar:link-broken-linear', danger: true }
]

const handleMenuAction = (action: string, item: SharedListItem) => {
    if (busy.value) return
    if (action === 'share') openShareSettings(item)
    else if (action === 'copy') copyLink(item)
    else if (action === 'open' && item.isAvailable) navigateTo(itemLocation(item))
    else if (action === 'remove') removeLink(item)
}
const now = ref(Date.now())
const typeLabels = { file: 'File', folder: 'Folder', note: 'Note' }
const statusLabels = { active: 'Active', expired: 'Expired', unavailable: 'Unavailable' }
let requestId = 0
let clock: ReturnType<typeof setInterval> | undefined

const itemStatus = (item: SharedListItem) => {
    if (!item.isAvailable) return 'unavailable'
    return item.expiresAt && new Date(item.expiresAt).getTime() <= now.value ? 'expired' : 'active'
}

const filteredItems = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return entries.value.filter(item =>
        (!query || item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query))
        && (activeCategory.value === 'All' || `${typeLabels[item.itemType]}s` === activeCategory.value)
        && (statusFilter.value === 'all' || itemStatus(item) === statusFilter.value))
})

const { sortedItems } = useSort(filteredItems, sortMode, item => item.name, item => item.createdAt)
const itemsPerPage = computed(() => preferences.value.pageSize === 'auto' ? 12 : preferences.value.pageSize)
const { currentPage, totalPages, paginatedItems } = usePagination(sortedItems, itemsPerPage)
const allSelected = computed(() => paginatedItems.value.length > 0
    && paginatedItems.value.every(item => selectedIds.value.includes(item.id)))
const partiallySelected = computed(() => !allSelected.value
    && paginatedItems.value.some(item => selectedIds.value.includes(item.id)))

const toggleSelectAll = (event: Event) => {
    if (busy.value) return

    const pageIds = paginatedItems.value.map(item => item.id)

    selectedIds.value = (event.target as HTMLInputElement).checked
        ? [...new Set([...selectedIds.value, ...pageIds])]
        : selectedIds.value.filter(id => !pageIds.includes(id))
}

const loadShares = async () => {
    if (busy.value) return

    const id = ++requestId
    isLoading.value = true
    loadError.value = null

    try {
        const result = await requestFetch<SharedListItem[]>('/api/shared/list')
        if (id === requestId) entries.value = result
    } catch (error: any) {
        if (id === requestId) loadError.value = error.data?.message || error.message || 'Could not load shared items.'
    } finally {
        if (id === requestId) isLoading.value = false
    }
}

const clearFilters = () => {
    searchQuery.value = ''
    activeCategory.value = 'All'
    statusFilter.value = 'all'
}

const itemIcon = (item: SharedListItem) => item.itemType === 'folder'
    ? 'solar:folder-bold'
    : item.itemType === 'note' ? 'solar:notebook-bold' : getFileIcon(item.mimeType, item.name)

const itemLocation = (item: SharedListItem) => ({
    path: `/${{ file: 'files', folder: 'folders', note: 'notes' }[item.itemType]}/${encodeURIComponent(item.itemId)}`,
    query: { from: '/shared' }
})

const formatDate = (value: string, includeTime = true) => new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' as const } : {}), timeZone: 'UTC'
}).format(new Date(value))

const copyLink = async (item: SharedListItem) => {
    if (busy.value || !item.isAvailable) return

    try {
        await navigator.clipboard.writeText(item.url)
        openToast('Link copied.', 'success')
    } catch {
        openToast('Could not copy the link. You can select and copy it from the link field.', 'error')
    }
}

const removeLink = async (item: SharedListItem) => {
    if (busy.value) return

    removingId.value = item.id

    try {
        if (!(await confirm({
            title: 'Remove share link?',
            message: `The link for "${item.name}" will stop working. The original item will be kept.`,
            confirmText: 'Remove link',
            variant: 'danger'
        }))) return

        await $fetch(`/api/shared/items/${item.itemType}/${encodeURIComponent(item.itemId)}`, { method: 'DELETE' })
        entries.value = entries.value.filter(entry => entry.id !== item.id)
        openToast('Share link removed.', 'success', { notification: { title: 'Share link removed', category: 'sharing', href: '/shared' } })
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not remove the share link.', 'error')
    } finally {
        removingId.value = null
    }
}

const removeSelected = async () => {
    if (busy.value || !selectedEntries.value.length) return

    const shareIds = selectedEntries.value.map(item => item.id)
    const count = shareIds.length
    bulkRemoving.value = true

    try {
        if (!(await confirm({
            title: count === 1 ? 'Remove selected share link?' : `Remove ${count} share links?`,
            message: 'The selected links will stop working. Original files, folders, and notes will be kept.',
            confirmText: count === 1 ? 'Remove link' : 'Remove links',
            variant: 'danger'
        }))) return

        const result = await $fetch('/api/shared/bulk-delete', { method: 'POST', body: { shareIds } })
        const deleted = new Set(result.deletedIds)
        entries.value = entries.value.filter(item => !deleted.has(item.id))
        selectedIds.value = selectedIds.value.filter(id => !deleted.has(id))
        openToast(result.deletedCount === 1 ? 'Share link removed.' : `${result.deletedCount} share links removed.`, 'success', { notification: { title: 'Share links removed', category: 'sharing', href: '/shared' } })
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not remove the selected share links.', 'error')
    } finally {
        bulkRemoving.value = false
    }
}

const shareChanged = (state: ShareState) => {
    const selected = settingsItem.value
    if (!selected) return

    if (!state.url) {
        entries.value = entries.value.filter(item => item.id !== selected.id)
        settingsItem.value = null
        return
    }

    const updated = { ...selected, ...state, url: state.url }
    entries.value = entries.value.map(item => item.id === selected.id ? updated : item)
    settingsItem.value = updated
}

watch(() => preferences.value.defaultSort, value => { sortMode.value = value })
watch([searchQuery, activeCategory, statusFilter, sortMode, itemsPerPage], () => {
    currentPage.value = 1
    selectedIds.value = []
})
watch(entries, items => {
    const remaining = new Set(items.map(item => item.id))
    selectedIds.value = selectedIds.value.filter(id => remaining.has(id))
})
watch(totalPages, total => { currentPage.value = Math.min(currentPage.value, Math.max(1, total)) })
onBeforeRouteLeave(() => removingId.value === null && !bulkRemoving.value && !settingsSaving.value)
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 30000) })
onBeforeUnmount(() => { requestId++; clearInterval(clock) })

await loadShares()
</script>

<style scoped>
@reference "../../../assets/css/tailwind.css";

.shared-button {
    @apply inline-flex h-control cursor-pointer items-center justify-center gap-2 rounded-control border border-control-border bg-control px-3 text-control-size text-secondary hover:enabled:bg-raised disabled:cursor-not-allowed disabled:opacity-40;
}
.shared-icon {
    @apply inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-label no-underline hover:enabled:bg-raised hover:bg-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
</style>
