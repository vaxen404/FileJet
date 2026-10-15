<template>
    <div class="notes-page">
        <div class="notes-header">
            <div class="notes-toolbar">
                <SearchBox 
                    v-model="searchQuery"
                    placeholder="Search notes..."
                />

                <div class="toolbar-actions">
                    <SortDropdown v-model="sortMode" />
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton text="Upload" mode="file" @files="handleNoteUpload"/>


                    <button
                        type="button"
                        class="new-note-button"
                        @click="createNote"
                    >
                        <Icon name="solar:add-circle-bold" />
                        New Note
                    </button>
                </div>
            </div>

            <div v-if="selectedNotes.length" class="selection-toolbar" role="group" aria-label="Selected notes">
                <span role="status" aria-live="polite">{{ selectedNotes.length }} selected</span>

                <div class="selection-actions">
                    <button type="button" class="selection-btn" :disabled="pending" @click="selectedNotes = []">
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
            drop-text="Drop notes to upload"
            @dragover="isDragging = true"
            @dragleave="isDragging = false"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="loading-state" role="status" aria-live="polite">
                    <span class="loading-spinner" aria-hidden="true" />
                    <span>Loading notes...</span>
                </div>
            </template>

            <template v-if="!pending && filteredNotes.length === 0" #empty>
                <div class="empty-state">
                    <Icon name="solar:notebook-linear" size="2.5rem" class="empty-state-icon" />
                    <strong>{{ notes.length ? 'No matching notes' : 'No notes yet' }}</strong>
                    <span class="empty-state-description">
                        {{ notes.length ? 'Try a different search.' : 'Create your first note to get started.' }}
                    </span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll">
                    <table class="notes-table">
                        <thead>
                            <tr>
                                <th>
                                    <input 
                                        type="checkbox"
                                        class="note-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="pending"
                                        aria-label="Select all notes on this page"
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
                                <th>Size</th>
                                <th>Modified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="note in paginatedNotes"
                                :key="note.id"
                                :class="{ selected: selectedNotes.includes(note.id) }"
                                @click="openNote(note)"
                            >
                                <td @click.stop>
                                    <input 
                                        v-model="selectedNotes"
                                        type="checkbox"
                                        class="note-checkbox"
                                        :value="note.id"
                                        :disabled="pending"
                                        :aria-label="`Select ${note.title}`"
                                    >
                                </td>

                                <td>
                                    <div class="note-name">
                                        <div class="note-icon">
                                            <Icon name="solar:notebook-bold" />
                                        </div>

                                        <div class="note-info">
                                            <strong :title="note.title">{{ note.title }}</strong>
                                            <span>
                                                {{ formatFileSize(note.size) }} • {{ formatFileTime(note.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>Note</td>
                                <td>{{ formatFileSize(note.size) }}</td>
                                <td>{{ formatFileTime(note.updated_at) }}</td>

                                <td @click.stop>
                                    <ItemMenu
                                        type="note"
                                        :actions="['open', 'edit', 'rename', 'download', 'favorite', 'delete']"
                                        :is-favorite="isNoteFavorite(note.id)"
                                        @open="openNote(note)"
                                        @edit="editNote(note)"
                                        @rename="renameNote(note)"
                                        @download="downloadNote(note)"
                                        @favorite="favoriteNote(note)"
                                        @delete="deleteNote(note)"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #grid>
                <div
                    v-for="note in paginatedNotes"
                    :key="note.id"
                    class="note-card"
                    :class="{ selected: selectedNotes.includes(note.id) }"
                    @click="openNote(note)"
                >
                    <div class="note-card-top">
                        <div class="note-card-icon">
                            <Icon name="solar:notebook-bold" />
                        </div>

                        <div class="note-card-actions" @click.stop>
                            <label class="note-card-select">
                                <input
                                    v-model="selectedNotes"
                                    type="checkbox"
                                    class="note-checkbox"
                                    :value="note.id"
                                    :disabled="pending"
                                    :aria-label="`Select ${note.title}`"
                                >
                            </label>

                            <ItemMenu
                                type="note"
                                :actions="['open', 'edit', 'rename', 'download', 'favorite', 'delete']"
                                :is-favorite="isNoteFavorite(note.id)"
                                @open="openNote(note)"
                                @edit="editNote(note)"
                                @rename="renameNote(note)"
                                @download="downloadNote(note)"
                                @favorite="favoriteNote(note)"
                                @delete="deleteNote(note)"
                            />
                        </div>
                    </div>

                    <div class="note-card-info">
                        <strong :title="note.title">{{ note.title }}</strong>
                        <span>{{ note.content || 'Empty note' }}</span>
                    </div>

                    <div class="note-card-bottom">
                        <span>{{ formatFileSize(note.size) }}</span>
                        <span>{{ formatFileTime(note.created_at) }}</span>
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
import { formatFileSize, formatFileTime } from '~/utils/file'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const {
    isLoading,
    isUploading,
    isDeleting,
    
} = useNoteActions()

const { openToast } = useToast()
const { notes, favorites, pending, error, fetchAll } = useUser()
type NoteItem = (typeof notes.value)[number]

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const isDragging = ref(false)
const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const filteredNotes = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return notes.value.filter(note => {
        return note.title.toLowerCase().includes(query)
    })
})

const { sortedItems: sortedNotes } = useSort(
    filteredNotes, sortMode, note => note.title, note => note.created_at
)

const itemsPerPage = computed(() => viewMode.value === 'list' ? 12 : 20)
const { currentPage, totalPages, paginatedItems: paginatedNotes } = usePagination(
    sortedNotes,
    itemsPerPage
)

const { selectedItems: selectedNotes, allSelected, toggleSelectAll } = useSelection(paginatedNotes)
const partiallySelected = computed(() => {
    return !allSelected.value && paginatedNotes.value.some(note => selectedNotes.value.includes(note.id))
})

const isNoteFavorite = (noteId: string) => {
    return favorites.value.some(favorite => favorite.note_id === noteId)
}

const handleDrop = (event: DragEvent) => {
    isDragging.value = false
    const droppedNotes = event.dataTransfer?.files
    if (!droppedNotes?.length) return
    console.log('Upload notes:', droppedNotes)
}

const handleNoteUpload = (files: FileList) => {
    if (!files.length) return
    console.log('Upload notes:', files)
}

const createNote = () => {
    console.log('Create note')
}

const openNote = (note: NoteItem) => {
    console.log('Open:', note.title)
}

const editNote = (note: NoteItem) => {
    console.log('Edit:', note.title)
}

const downloadNote = (note: NoteItem) => {
    console.log('Download:', note.title)
}

const renameNote = (note: NoteItem) => {
    console.log('Rename:', note.title)
}

const favoriteNote = (note: NoteItem) => {
    console.log('Favorite:', note.title)
}

const deleteNote = (note: NoteItem) => {
    console.log('Delete:', note.title)
}

const handleDeleteSelected = () => {
    if (!selectedNotes.value.length || pending.value) return
    console.log('Delete selected notes:', [...selectedNotes.value])
}

watch(notes, (items) => {
    const availableIds = new Set(items.map(note => note.id))
    selectedNotes.value = selectedNotes.value.filter(id => availableIds.has(id))
})

watch(totalPages, (total) => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, sortMode, viewMode], () => {
    currentPage.value = 1
})
</script>

<style scoped>
.notes-page {
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

.notes-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0 0.5rem;
}

.notes-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.875rem;
}

.notes-toolbar :deep(.search-box) {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 32rem;
    box-sizing: border-box;
}

.toolbar-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.new-note-button {
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 0.5rem;

    padding: 0 1rem;

    background: #3c47be;
    color: #ffffff;

    border: none;
    border-radius: 0.625rem;

    font-size: 0.9rem;
    font-weight: 500;

    cursor: pointer;

    transition:
        background 0.2s ease,
        transform 0.2s ease;
}

.new-note-button:hover {
    background: #4a56d4;
    transform: translateY(-1px);
}

.new-note-button:active {
    transform: translateY(0);
}

.table-scroll {
    flex: 1;
    min-height: 0;

    overflow-y: auto;
    overflow-x: hidden;
}

.notes-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
}

.notes-table th,
.notes-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.notes-table thead th {
    height: 3.8rem;

    position: sticky;
    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.notes-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.notes-table tbody tr:hover {
    background: #1f1f23;
}

.notes-table th:first-child,
.notes-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.notes-table th:nth-child(2),
.notes-table td:nth-child(2) {
    width: 42%;
}

.note-checkbox {
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

.note-checkbox:hover:not(:disabled) {
    border-color: #8b7cff;
}

.note-checkbox:checked,
.note-checkbox:indeterminate {
    background: #3c47be;
    border-color: #5965ed;
}

.note-checkbox:checked::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.15rem;
    border: solid #ffffff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.note-checkbox:indeterminate::after {
    content: '';
    width: 0.55rem;
    height: 2px;
    margin: 0;
    background: #ffffff;
    border: 0;
    border-radius: 1px;
    transform: none;
}

.note-checkbox:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.note-checkbox:disabled {
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

.note-name {
    display: flex;
    align-items: center;

    gap: 0.8rem;
}

.note-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #9c8cff;
    background: #29215c;

    border: 1px solid #443b82;
    border-radius: 0.55rem;

    font-size: 1.2rem;
}

.note-info {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 0.2rem;
}

.note-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
}

.note-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.note-card {
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

    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}

.note-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.note-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.note-card-icon {
    width: 2.7rem;
    height: 2.7rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #9c8cff;
    background: #29215c;

    border: 1px solid #443b82;
    border-radius: 0.55rem;

    font-size: 1.25rem;
}

.note-card-info {
    display: flex;
    flex-direction: column;

    gap: 0.3rem;
}

.note-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.note-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.note-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
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

.notes-table {
    min-width: 44rem;
    table-layout: fixed;
}

.notes-table tbody tr.selected {
    background: #201d2d;
}

.note-info strong,
.note-info span,
.note-card-info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.note-card,
.note-card-info {
    min-width: 0;
}

.note-card {
    transition: background 0.2s ease, border-color 0.2s ease;
}

.note-card.selected {
    background: #201d2d;
    border-color: #6055b8;
}

.note-card-icon {
    flex-shrink: 0;
}

.note-card-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0.25rem;
}

.note-card-select {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.45rem;
    cursor: pointer;
}

.note-card-select:hover {
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

.note-card-info span {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
}

.notes-page :deep(.grid-view) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1500px) {
    .notes-page :deep(.grid-view) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 1100px) {
    .notes-page :deep(.grid-view) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 800px) {
    .notes-page :deep(.grid-view) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .notes-page :deep(.grid-view) {
        grid-template-columns: minmax(0, 1fr);
    }
}


@media (max-width: 800px) {
    .notes-toolbar :deep(.search-box) {
        flex-basis: 100%;
        max-width: none;
    }
}
</style>
