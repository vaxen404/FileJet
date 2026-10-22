<template>
    <div
        class="folder-browser"
        :class="{ 'is-read-only': readOnly }"
    >
        <div class="contents-toolbar">
            <SearchBox
                v-model="search"
                placeholder="Search this folder..."
            />
            <div class="contents-controls">
                <SortDropdown v-model="sort" />
                <ViewSwitcher v-model="view" />
                <slot name="controls" />
            </div>
        </div>
        <DataView
            :view-mode="view"
            :is-loading="pending"
        >
            <template #loading>
                <div class="contents-empty">Loading folder contents...</div>
            </template>
            <template
                v-if="!pending && !filtered.length"
                #empty
            >
                <div class="contents-empty">
                    <Icon
                        name="solar:folder-linear"
                        size="2.5rem"
                    />
                    <strong>{{ search ? 'No matching items' : 'This folder is empty' }}</strong>
                </div>
            </template>
            <template #list>
                <div class="table-scroll">
                    <table class="contents-table">
                        <thead>
                            <tr>
                                <th v-if="!readOnly">
                                    <input
                                        type="checkbox"
                                        class="item-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="busy"
                                        @change="toggleSelectAll"
                                    />
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Size</th>
                                <th>Modified</th>
                                <th v-if="!readOnly">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in paginatedItems"
                                :key="item.id"
                                :class="{ selected: selected.includes(item.id) }"
                                @click="$emit('open', item)"
                                @contextmenu.prevent.stop="contextMenu($event, item)"
                            >
                                <td
                                    v-if="!readOnly"
                                    @click.stop
                                >
                                    <input
                                        v-model="selected"
                                        type="checkbox"
                                        class="item-checkbox"
                                        :value="item.id"
                                        :disabled="busy"
                                    />
                                </td>
                                <td>
                                    <div class="item-name">
                                        <span class="item-icon"><Icon :name="icon(item)" /></span>
                                        <strong :title="item.name">{{ item.name }}</strong>
                                    </div>
                                </td>
                                <td>{{ item.type }}</td>
                                <td>
                                    {{ item.type === 'folder' ? '—' : formatFileSize(item.size) }}
                                </td>
                                <td>{{ formatFileTime(item.updated_at ?? item.created_at) }}</td>
                                <td
                                    v-if="!readOnly"
                                    @click.stop
                                >
                                    <ItemMenu
                                        :ref="menu => setMenu(item.id, menu)"
                                        :type="item.type"
                                        :is-favorite="favoriteIds.includes(item.id)"
                                        :can-copy="
                                            item.type === 'file' &&
                                            canCopyFile(item.mime_type, item.original_name)
                                        "
                                        @open="$emit('open', item)"
                                        @edit="$emit('action', 'edit', item)"
                                        @rename="$emit('action', 'rename', item)"
                                        @download="$emit('action', 'download', item)"
                                        @copy="$emit('action', 'copy', item)"
                                        @favorite="$emit('action', 'favorite', item)"
                                        @delete="$emit('action', 'delete', item)"
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
                        :title="item.name"
                        :icon="icon(item)"
                        :selected="selected.includes(item.id)"
                        :class="'item-type-' + item.type"
                        @click="$emit('open', item)"
                        @contextmenu.prevent.stop="contextMenu($event, item)"
                    >
                        <template
                            v-if="
                                item.type === 'file' &&
                                previewUrl &&
                                (item.mime_type?.startsWith('image/') ||
                                    item.mime_type?.startsWith('video/'))
                            "
                            #preview
                        >
                            <img
                                v-if="item.mime_type?.startsWith('image/')"
                                :src="previewUrl(item)"
                                :alt="item.name"
                                class="item-preview"
                                loading="lazy"
                            />
                            <video
                                v-else
                                :src="previewUrl(item)"
                                class="item-preview"
                                preload="metadata"
                                muted
                                playsinline
                            />
                        </template>
                        <template
                            v-if="!readOnly"
                            #actions
                        >
                            <label class="file-select">
                                <input
                                    v-model="selected"
                                    type="checkbox"
                                    class="item-checkbox"
                                    :value="item.id"
                                    :disabled="busy"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setMenu(item.id, menu)"
                                :type="item.type"
                                :is-favorite="favoriteIds.includes(item.id)"
                                :can-copy="
                                    item.type === 'file' &&
                                    canCopyFile(item.mime_type, item.original_name)
                                "
                                @open="$emit('open', item)"
                                @edit="$emit('action', 'edit', item)"
                                @rename="$emit('action', 'rename', item)"
                                @download="$emit('action', 'download', item)"
                                @copy="$emit('action', 'copy', item)"
                                @favorite="$emit('action', 'favorite', item)"
                                @delete="$emit('action', 'delete', item)"
                            />
                        </template>
                        <template #metadata>
                            <span>{{
                                item.type === 'folder' ? 'Folder' : formatFileSize(item.size)
                            }}</span>
                            &middot;
                            <span>{{ formatFileTime(item.created_at) }}</span>
                        </template>
                    </ItemGridCard>
                </ItemGrid>
            </template>
        </DataView>
        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="view"
        />
        <SelectionToolbar
            v-if="!readOnly"
            :items="selectionItems"
            :busy="busy || pending"
            :current-folder-id="currentFolderId"
            @clear="selected = []"
            @delete="
                $emit(
                    'deleteSelected',
                    items.filter(item => selected.includes(item.id))
                )
            "
            @moved="handleSelectionMoved"
        />
    </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { LibraryItem } from '~~/shared/types/library'
import type ItemMenu from './ItemMenu.vue'
import { canCopyFile, formatFileSize, formatFileTime, getFileIcon } from '~/utils/file'

const props = withDefaults(
    defineProps<{
        items: LibraryItem[]
        favoriteIds?: string[]
        pending?: boolean
        busy?: boolean
        readOnly?: boolean
        currentFolderId?: string | null
        previewUrl?: (item: LibraryItem) => string
    }>(),
    { favoriteIds: () => [], pending: false, busy: false, readOnly: false }
)

const emit = defineEmits<{
    open: [item: LibraryItem]
    action: [action: string, item: LibraryItem]
    deleteSelected: [items: LibraryItem[]]
    moved: []
}>()

const search = ref('')
const view = ref<'grid' | 'list'>('grid')
const sort = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const filtered = computed(() =>
    props.items.filter(item => item.name.toLowerCase().includes(search.value.trim().toLowerCase()))
)

const { sortedItems } = useSort(
    filtered,
    sort,
    item => item.name,
    item => item.created_at
)

const perPage = computed(() => (view.value === 'list' ? 12 : 24))
const { currentPage, totalPages, paginatedItems } = usePagination(sortedItems, perPage)
const { selectedItems: selected, allSelected, toggleSelectAll } = useSelection(paginatedItems)

const selectionItems = computed(() =>
    props.items
        .filter(item => selected.value.includes(item.id))
        .map(item => ({ id: item.id, type: item.type }))
)

const handleSelectionMoved = () => {
    selected.value = []
    emit('moved')
}

const partiallySelected = computed(
    () => !allSelected.value && paginatedItems.value.some(item => selected.value.includes(item.id))
)

const menus = new Map<string, InstanceType<typeof ItemMenu>>()

const setMenu = (id: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) menus.set(id, menu as InstanceType<typeof ItemMenu>)
    else menus.delete(id)
}

const contextMenu = (event: MouseEvent, item: LibraryItem) => {
    if (!props.readOnly && !props.busy) menus.get(item.id)?.openAt(event.clientX, event.clientY)
}

const icon = (item: LibraryItem) =>
    item.type === 'folder'
        ? 'solar:folder-bold'
        : item.type === 'note'
          ? 'solar:notebook-bold'
          : getFileIcon(item.mime_type ?? null, item.original_name)

watch([search, sort, view], () => {
    currentPage.value = 1
})
watch(totalPages, total => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})
watch(
    () => props.items,
    items => {
        const available = new Set(items.map(item => item.id))
        selected.value = selected.value.filter(id => available.has(id))
    }
)
</script>

<style scoped>
.folder-browser {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    box-sizing: border-box;
}

.folder-browser.is-read-only :deep(.items-grid) {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
}

.folder-browser :deep(.file-card .file-overlay:empty) {
    pointer-events: none;
}

.contents-toolbar,
.contents-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.contents-toolbar {
    justify-content: space-between;
}

.contents-toolbar :deep(.search-box) {
    flex: 1 1 12rem;
    max-width: 32rem;
    min-width: 0;
    box-sizing: border-box;
}

.contents-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 12rem;
    color: #898991;
}

.table-scroll {
    min-height: 0;
    overflow: auto;
}

.contents-table {
    border-collapse: collapse;
    width: 100%;
    min-width: 36rem;
    text-align: left;
    font-size: 0.85rem;
    color: #b5b5bd;
}

th,
td {
    padding: 0.75rem;
    border-bottom: 1px solid #29292e;
}

th {
    position: sticky;
    top: 0;
    background: #1a1a1d;
    font-weight: 500;
    color: #a3a3ab;
}

tbody tr {
    cursor: pointer;
}

tbody tr:hover,
tbody tr.selected {
    background: #1f1f23;
}

.item-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.item-name strong {
    max-width: 18rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 2.7rem;
    height: 2.7rem;
    border-radius: 10px;
    background: #282354;
    color: #8b7cff;
    font-size: var(--ui-control-icon-size, 1.125rem);
}

.item-checkbox {
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

.item-checkbox:hover:not(:disabled) {
    border-color: #8b7cff;
}

.item-checkbox:checked,
.item-checkbox:indeterminate {
    background: #3c47be;
    border-color: #5965ed;
}

.item-checkbox:checked::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.15rem;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.item-checkbox:indeterminate::after {
    content: '';
    width: 0.55rem;
    height: 2px;
    margin: 0;
    background: #ffffff;
    border: 0;
    transform: none;
}

.item-checkbox:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.item-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.item-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

@media (max-width: 500px) {
    .folder-browser {
        padding: 0.75rem;
    }
}
</style>
