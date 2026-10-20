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
                    <UploadButton
                        text="Upload"
                        mode="file"
                        accept=".txt,.md"
                        @files="handleNoteUpload"
                    />

                    <button
                        type="button"
                        class="new-note-button"
                        @click="createNote"
                    >
                        <Icon name="solar:add-circle-bold" class="new-note-icon" aria-hidden="true" />
                        New Note
                    </button>
                </div>
            </div>

        </div>

        <DataView
            :view-mode="viewMode"
            :is-loading="isInitialLoading"
            :aria-busy="pending || isLoading || isBulkDeleting"
            drop-text="Drop notes to upload"
            @drop="handleDrop"
        >
            <template #loading>
                <div
                    class="loading-state"
                    role="status"
                >
                    Loading notes...
                </div>
            </template>
            <template
                v-if="!isInitialLoading && filteredNotes.length === 0"
                #empty
            >
                <div class="empty-state">
                    <Icon
                        name="solar:notebook-bold"
                        size="2.5rem"
                        class="empty-state-icon"
                    />
                    <strong>{{
                        error
                            ? 'Unable to load notes'
                            : notes.length
                              ? 'No matching notes'
                              : 'No notes yet'
                    }}</strong>
                    <span class="empty-state-description">{{
                        error ||
                        (notes.length
                            ? 'Try a different search.'
                            : 'Create your first note to get started.')
                    }}</span>
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
                                        :disabled="busy"
                                        aria-label="Select all notes on this page"
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
                                @contextmenu.prevent.stop="openContextMenu($event, note.id)"
                            >
                                <td @click.stop>
                                    <input
                                        v-model="selectedNotes"
                                        type="checkbox"
                                        class="note-checkbox"
                                        :value="note.id"
                                        :disabled="busy"
                                        :aria-label="`Select ${note.title}`"
                                    />
                                </td>

                                <td>
                                    <div class="note-name">
                                        <div class="note-icon">
                                            <Icon name="solar:notebook-bold" />
                                        </div>

                                        <div class="note-info">
                                            <strong :title="note.title">{{ note.title }}</strong>
                                            <span>
                                                {{ formatFileSize(note.size) }} •
                                                {{ formatFileTime(note.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>Note</td>
                                <td>{{ formatFileSize(note.size) }}</td>
                                <td>{{ formatFileTime(note.updated_at) }}</td>

                                <td @click.stop>
                                    <ItemMenu
                                        :ref="menu => setNoteMenuRef(note.id, menu)"
                                        type="note"
                                        :actions="[
                                            'open',
                                            'edit',
                                            'rename',
                                            'download',
                                            'favorite',
                                            'delete'
                                        ]"
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
                <ItemGrid>
                    <ItemGridCard
                        v-for="note in paginatedNotes"
                        :key="note.id"
                        :title="note.title"
                        icon="solar:notebook-bold"
                        :selected="selectedNotes.includes(note.id)"
                        @click="openNote(note)"
                        @contextmenu.prevent.stop="openContextMenu($event, note.id)"
                    >
                        <template #actions>
                            <label class="file-select">
                                <input
                                    v-model="selectedNotes"
                                    type="checkbox"
                                    class="note-checkbox"
                                    :value="note.id"
                                    :disabled="busy"
                                    :aria-label="`Select ${note.title}`"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setNoteMenuRef(note.id, menu)"
                                type="note"
                                :actions="[
                                    'open',
                                    'edit',
                                    'rename',
                                    'download',
                                    'favorite',
                                    'delete'
                                ]"
                                :is-favorite="isNoteFavorite(note.id)"
                                @open="openNote(note)"
                                @edit="editNote(note)"
                                @rename="renameNote(note)"
                                @download="downloadNote(note)"
                                @favorite="favoriteNote(note)"
                                @delete="deleteNote(note)"
                            />
                        </template>
                        <template #metadata>
                            <span>{{ formatFileSize(note.size) }}</span>
                            ·
                            <span>{{ formatFileTime(note.created_at) }}</span>
                        </template>
                    </ItemGridCard>
                </ItemGrid>
            </template>
        </DataView>
        <UploadProgress
            :active="isUploading"
            :progress="uploadProgress"
            :processing="isProcessing"
            label="Uploading notes..."
        />
        <NoteFormModal
            :open="noteModalOpen"
            :mode="noteModalMode"
            :note="activeNote"
            @close="noteModalOpen = false"
            @saved="handleNoteSaved"
        />

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="viewMode"
        />
        <SelectionToolbar
            :items="selectionItems"
            :busy="busy"
            @clear="selectedNotes = []"
            @delete="handleDeleteSelected"
            @moved="handleSelectionMoved"
        />
    </div>
</template>

<script setup lang="ts">
import { formatFileSize, formatFileTime } from '~/utils/file'
import type { ComponentPublicInstance } from 'vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const {
    isLoading,
    isUploading,
    isProcessing,
    isDeleting,
    uploadProgress,
    uploadNote,
    deleteNote: removeNote,
    deleteNotes
} = useNoteActions()

const { openToast } = useToast()
const { notes, favorites, pending, error, fetchAll } = useUser()
type NoteItem = (typeof notes.value)[number]

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('grid')
const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

const filteredNotes = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return notes.value.filter(note => {
        return note.title.toLowerCase().includes(query)
    })
})

const { sortedItems: sortedNotes } = useSort(
    filteredNotes,
    sortMode,
    note => note.title,
    note => note.created_at
)

const itemsPerPage = computed(() => (viewMode.value === 'list' ? 12 : 24))

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedNotes
} = usePagination(sortedNotes, itemsPerPage)

const { selectedItems: selectedNotes, allSelected, toggleSelectAll } = useSelection(paginatedNotes)

const selectionItems = computed(() => selectedNotes.value.map(id => ({ id, type: 'note' as const })))
const handleSelectionMoved = async () => {
    selectedNotes.value = []
    await fetchAll()
    if (error.value) openToast(error.value, 'error')
}

const partiallySelected = computed(() => {
    return (
        !allSelected.value &&
        paginatedNotes.value.some(note => selectedNotes.value.includes(note.id))
    )
})

const isNoteFavorite = (noteId: string) => {
    return favorites.value.some(favorite => favorite.note_id === noteId)
}

const handleDrop = async (event: DragEvent) => {
    const droppedNotes = event.dataTransfer?.files
    if (!droppedNotes?.length) return
    await handleNoteUpload(droppedNotes)
}

const handleNoteUpload = async (files: FileList) => {
    if (!files.length) return

    try {
        await uploadNote(files, async () => {
            await fetchAll()
            if (error.value) throw new Error(error.value)
        })
        openToast('Notes uploaded successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Note upload failed.', 'error')
    }
}

const noteModalOpen = ref(false)
const noteModalMode = ref<'create' | 'edit'>('create')
const activeNote = ref<NoteItem | null>(null)
const isBulkDeleting = ref(false)
const isFavoriting = ref(false)

const busy = computed(
    () => pending.value || isLoading.value || isBulkDeleting.value || isFavoriting.value
)

const isInitialLoading = computed(
    () => pending.value && notes.value.length === 0 && !isUploading.value
)

const { addFavorite, removeFavorite } = useFavoriteActions()
const noteMenus = new Map<string, InstanceType<typeof ItemMenu>>()

const setNoteMenuRef = (id: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) noteMenus.set(id, menu as InstanceType<typeof ItemMenu>)
    else noteMenus.delete(id)
}

const openContextMenu = (event: MouseEvent, id: string) => {
    noteMenus.get(id)?.openAt(event.clientX, event.clientY)
}

const createNote = () => {
    activeNote.value = null
    noteModalMode.value = 'create'
    noteModalOpen.value = true
}

const openNote = (note: NoteItem) =>
    navigateTo({ path: '/notes/' + note.id, query: { from: '/notes' } })

const editNote = openNote

const renameNote = (note: NoteItem) =>
    navigateTo({ path: '/notes/' + note.id, query: { from: '/notes', tab: 'edit' } })

const handleNoteSaved = async () => {
    await fetchAll()
    if (error.value) openToast(error.value, 'error')
}

const downloadNote = (note: NoteItem) => {
    const url = URL.createObjectURL(new Blob([note.content], { type: 'text/plain;charset=utf-8' }))
    try {
        const link = document.createElement('a')
        link.href = url
        link.download = `${note.title.replace(/[/\\\0]/g, '_')}.txt`
        document.body.appendChild(link)
        link.click()
        link.remove()
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}

const favoriteNote = async (note: NoteItem) => {
    if (isFavoriting.value) return
    isFavoriting.value = true
    try {
        const favorite = isNoteFavorite(note.id)
        if (favorite) await removeFavorite(note.id, 'note')
        else await addFavorite(note.id, 'note')
        await fetchAll()
        if (error.value) throw new Error(error.value)
        openToast(favorite ? 'Note removed from favorites.' : 'Note added to favorites.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not update favorite.', 'error')
    } finally {
        isFavoriting.value = false
    }
}

const deleteNote = async (note: NoteItem) => {
    if (isDeleting.value) return
    try {
        await removeNote(note.id)
        notes.value = notes.value.filter(item => item.id !== note.id)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not delete note.', 'error')
    }
}

const handleDeleteSelected = async () => {
    if (!selectedNotes.value.length || busy.value) return

    isBulkDeleting.value = true

    try {
        const result = await deleteNotes([...selectedNotes.value])
        const deleted = new Set(result.deletedIds)

        notes.value = notes.value.filter(note => !deleted.has(note.id))
        selectedNotes.value = selectedNotes.value.filter(id => !deleted.has(id))

        if (result.failedIds.length) {
            openToast(`${result.failedIds.length} items could not be moved to Trash.`, 'error')
        }
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'Could not delete selected notes.', 'error')
    } finally {
        isBulkDeleting.value = false
    }
}

watch(notes, items => {
    const availableIds = new Set(items.map(note => note.id))
    selectedNotes.value = selectedNotes.value.filter(id => availableIds.has(id))
})

watch(totalPages, total => {
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

    padding: 0;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.notes-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
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
    gap: 0.5rem;
    min-width: 0;
}

.new-note-button {
    height: var(--ui-control-height, 2.5rem);
    flex-shrink: 0;
    white-space: nowrap;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 0.5rem;

    padding: 0 0.75rem;

    background: #3c47be;
    color: #ffffff;

    border: none;
    border-radius: var(--ui-control-radius, 8px);

    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;

    cursor: pointer;

    transition:
        background 0.2s ease,
        transform 0.2s ease;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
    box-sizing: border-box;
}

.new-note-icon {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    font-size: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
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
    border-radius: 4px;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease;
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

    gap: 0.75rem;
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
    border-radius: 6px;

    font-size: 1.2rem;
}

.note-info {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 0.25rem;
}

.note-info strong {
    color: #ffffff;

    font-size: 0.875rem;
    font-weight: 600;

    white-space: nowrap;
    line-height: 1.5;
}

.note-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
    font-weight: 400;
    line-height: 1.5;
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
.note-info span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 800px) {
    .notes-toolbar :deep(.search-box) {
        flex-basis: 100%;
        max-width: none;
    }
}
</style>
