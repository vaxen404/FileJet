<script setup lang="ts">
import { formatFileSize } from '~/utils/file'

import {
    getItemIcon,
    getItemName,
    getItemType,
    getItemId,
    getItemActions,
    formatTime
} from '~/utils/favorite'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { toastMessage, toastType, showToast, openToast } = useToast()

const { addFavorite, removeFavorite } = useFavoriteActions()

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
        
        const matchesSearch =
            getItemName(item)
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

const sortedFavorites = computed(() => {
    const items = [...filteredFavorites.value]

    if (sortMode.value === 'newest') {
        return items.sort((a, b) => {
            return new Date(b.created_at ?? 0).getTime() -
                new Date(a.created_at ?? 0).getTime()
        })
    }

    if (sortMode.value === 'oldest') {
        return items.sort((a, b) => {
            return new Date(a.created_at ?? 0).getTime() -
                new Date(b.created_at ?? 0).getTime()
        })
    }

    if (sortMode.value === 'name-asc') {
        return items.sort((a, b) => {
            return getItemName(a).localeCompare(getItemName(b))
        })
    }

    return items.sort((a, b) => {
        return getItemName(b).localeCompare(getItemName(a))
    })
})

const handleFavorite = async (item: any) => {
    try {
        const type = getItemType(item)
        const itemId = getItemId(item)

        await removeFavorite(itemId, type)
        await fetchAll()

        openToast('Removed from favorites.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || 'Could not remove from favorites.',
            'error'
        )
    }
}

const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})

const { currentPage, totalPages, paginatedItems: paginatedFiles } = usePagination(
    sortedFavorites,
    itemsPerPage
)

const { selectedItems: selectedFavorites, allSelected, toggleSelectAll } = useSelection(paginatedFiles) 

type FavoriteResource = (typeof favorites.value)[number] & {
    files?: { size?: number | string | null } | null
    notes?: { size?: number | string | null } | null
}

const getItemSize = (item: FavoriteResource) => {
    const size = item.file_id
        ? item.files?.size
        : item.note_id
            ? item.notes?.size
            : null

    return size == null ? '-' : formatFileSize(size)
}

watch([searchQuery, activeCategory, viewMode, sortMode], () => {
    currentPage.value = 1
})
</script>

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
                <div class="favorites-filters" aria-label="Favorite categories">
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
            <template v-if="filteredFavorites.length === 0" #empty>
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
                                    >
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
                                v-for="item in paginatedFiles"
                                :key="item.id"
                                :class="{ selected: selectedFavorites.includes(item.id) }"
                            >
                                <td>
                                    <input
                                        v-model="selectedFavorites"
                                        type="checkbox"
                                        class="favorite-checkbox"
                                        :value="item.id"
                                        :aria-label="'Select ' + getItemName(item)"
                                    >
                                </td>

                                <td>
                                    <div class="favorite-name">
                                        <div class="favorite-icon">
                                            <Icon :name="getItemIcon(item)" />
                                        </div>

                                        <div class="favorite-info">
                                            <strong>{{ getItemName(item) }}</strong>
                                            <span>
                                                {{ getItemSize(item) }} • {{ formatTime(item.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td class="favorite-type">{{ getItemType(item) }}</td>
                                <td>{{ getItemSize(item) }}</td>
                                <td>{{ formatTime(item.created_at) }}</td>

                                <td>
                                    <ItemMenu
                                        :type="getItemType(item)"
                                        :actions="[...getItemActions(item)]"
                                        :is-favorite="true"
                                        @favorite="handleFavorite(item)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #grid>
                <div
                    v-for="item in paginatedFiles"
                    :key="item.id"
                    class="favorite-card"
                >
                    <div class="favorite-card-top">
                        <div class="favorite-card-icon">
                            <Icon :name="getItemIcon(item)" />
                        </div>

                        <ItemMenu
                            :type="getItemType(item)"
                            :actions="[...getItemActions(item)]"
                            :is-favorite="true"
                            @favorite="handleFavorite(item)"
                        />
                    </div>

                    <div class="favorite-card-info">
                        <strong>{{ getItemName(item) }}</strong>
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

<style scoped>
.favorites-page {
    width: 100%;
    height: 100%;
    min-height: 0;

    padding: 0.4rem 0.5rem;

    border-radius: 1rem;

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

    padding: 0 0.5rem;
}

.favorites-toolbar {
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

.favorites-subtoolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.favorites-filters {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 0.5rem;

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

    border-radius: 0.2rem;

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

.favorite-name {
    display: flex;

    align-items: center;

    gap: 0.8rem;
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

    border-radius: 0.55rem;

    font-size: 1.15rem;
}

.favorite-info {
    display: flex;

    flex-direction: column;

    gap: 0.2rem;

    min-width: 0;
}

.favorite-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
}

.favorite-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.favorite-card {
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

    border-radius: 0.55rem;

    font-size: 1.25rem;
}

.favorite-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.favorite-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.favorite-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.favorite-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}

.favorite-type {
    text-transform: capitalize;
}
</style>
