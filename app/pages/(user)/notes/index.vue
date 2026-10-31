<template>
    <QuickPreviewScope :items="quickPreviewItems" :selected-ids="selectedNotes" class="notes-page w-full flex-1 min-h-0 flex flex-col bg-transparent overflow-hidden">
        <div class="notes-header flex flex-col shrink-0 p-0 gap-3 mb-3">
            <div class="notes-toolbar flex items-center justify-between flex-wrap gap-2 min-w-0">
                <SearchBox class="[flex:1_1_18rem] min-w-0 max-w-128 max-tablet:basis-full max-tablet:max-w-none"
                    v-model="searchQuery"
                    placeholder="Search notes..."
                />

                <div class="toolbar-actions flex items-center flex-wrap gap-2 min-w-0">
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
                        class="new-note-button h-10 max-mobile:h-11 pointer-coarse:h-11 shrink-0 whitespace-nowrap flex
                            items-center justify-center gap-2 py-0 px-3 bg-primary text-on-primary border-0 rounded-lg text-sm
                            font-medium cursor-pointer transition-[background,transform] duration-200 leading-normal
                            hover:bg-primary/85 hover:-translate-y-px active:translate-y-0"
                        @click="createNote"
                    >
                        <Icon
                            name="solar:add-circle-bold"
                            class="new-note-icon block text-lg shrink-0 size-4.5"
                        />
                        New Note
                    </button>
                </div>
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-loading="isInitialLoading"
            drop-text="Drop notes to upload"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="loading-state text-label text-[0.85rem]">Loading notes...</div>
            </template>
            <template
                v-if="!isInitialLoading && filteredNotes.length === 0"
                #empty
            >
                <div class="empty-state w-full min-h-48 py-8 px-4 flex flex-col items-center justify-center gap-2 text-center">
                    <Icon
                        name="solar:notebook-bold"
                        size="2.5rem"
                        class="empty-state-icon block shrink-0 mb-2 text-accent text-[2.5rem]"
                    />
                    <strong class="text-foreground text-sm font-semibold leading-normal">{{
                        error
                            ? 'Unable to load notes'
                            : notes.length
                              ? 'No matching notes'
                              : 'No notes yet'
                    }}</strong>
                    <span class="empty-state-description text-muted text-sm font-normal leading-normal">{{
                        error ||
                        (notes.length
                            ? 'Try a different search.'
                            : 'Create your first note to get started.')
                    }}</span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                    <table class="mobile-item-table notes-table w-full border-separate border-spacing-0 bg-transparent border-0
                        min-w-176 table-fixed">
                        <thead>
                            <tr>
                                <th class="w-14 pl-4 pr-3 text-center file-table-heading">
                                    <input
                                        type="checkbox"
                                        class="note-checkbox file-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="busy"
                                        @change="toggleSelectAll"
                                    />
                                </th>

                                <th class="w-[42%] file-table-heading">
                                    <div class="name-header flex items-center gap-[0.3rem]">
                                        Name
                                        <Icon
                                            name="solar:sort-vertical-linear"
                                            class="text-base leading-[inherit]"
                                        />
                                    </div>
                                </th>

                                <th class="file-table-heading">Type</th>
                                <th class="file-table-heading">Size</th>
                                <th class="file-table-heading">Modified</th>
                                <th class="file-table-heading">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr class="hover:bg-surface-hover selected:bg-accent/8"
                                v-for="note in paginatedNotes"
                                :key="note.id"
                                :data-preview-id="note.id" tabindex="0" aria-keyshortcuts="Space"
                                :class="{ selected: selectedNotes.includes(note.id) }"
                                @click="openNote(note)"
                                @contextmenu.prevent.stop="openContextMenu($event, note.id)"
                            >
                                <td class="item-selection-cell h-[4.2rem] text-secondary text-[0.85rem] w-14 pl-4 pr-3 text-center
                                    file-table-cell" @click.stop>
                                    <input
                                        v-model="selectedNotes"
                                        type="checkbox"
                                        class="note-checkbox file-checkbox"
                                        :value="note.id"
                                        :disabled="busy"
                                    />
                                </td>

                                <td class="item-name-cell h-[4.2rem] text-secondary text-[0.85rem] w-[42%] file-table-cell">
                                    <div class="note-name flex items-center gap-3">
                                        <div class="note-icon flex items-center justify-center shrink-0 text-accent bg-accent/12 border border-accent/25
                                            rounded-md text-[1.2rem] size-10">
                                            <Icon name="solar:notebook-bold" />
                                        </div>

                                        <div class="note-info min-w-0 flex flex-col gap-1">
                                            <strong class="text-foreground text-sm font-semibold leading-normal truncate" :title="note.title">{{ note.title }}</strong>
                                            <span class="text-muted text-xs font-normal leading-normal truncate">
                                                {{ formatFileSize(note.size) }} •
                                                {{ formatFileTime(note.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td data-label="Type" class="item-meta-cell h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">Note</td>
                                <td data-label="Size" class="item-meta-cell h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ formatFileSize(note.size) }}</td>
                                <td data-label="Modified" class="item-meta-cell h-[4.2rem] text-secondary text-[0.85rem] file-table-cell">{{ formatFileTime(note.updated_at) }}</td>

                                <td class="item-actions-cell h-[4.2rem] text-secondary text-[0.85rem] file-table-cell" @click.stop>
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
                                :data-preview-id="note.id" tabindex="0" aria-keyshortcuts="Space"
                        :title="note.title"
                        icon="solar:notebook-bold"
                        :selected="selectedNotes.includes(note.id)"
                        @click="openNote(note)"
                        @contextmenu.prevent.stop="openContextMenu($event, note.id)"
                    >
                        <template #actions>
                            <label class="file-select flex items-center justify-center bg-selection-surface border border-selection-border
                                rounded-full cursor-pointer size-8">
                                <input
                                    v-model="selectedNotes"
                                    type="checkbox"
                                    class="note-checkbox file-checkbox m-0 accent-accent cursor-pointer size-[1.1rem]"
                                    :value="note.id"
                                    :disabled="busy"
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
                            <span class="min-w-0 first:shrink-0 truncate">{{ formatFileSize(note.size) }}</span>
                            ·
                            <span class="min-w-0 first:shrink-0 truncate">{{ formatFileTime(note.created_at) }}</span>
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
    </QuickPreviewScope>
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
const { itemsPerPage } = useBrowsePreferences(viewMode, sortMode)

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

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedNotes
} = usePagination(sortedNotes, itemsPerPage)

const { selectedItems: selectedNotes, allSelected, toggleSelectAll } = useSelection(paginatedNotes)

const selectionItems = computed(() =>
    selectedNotes.value.map(id => ({ id, type: 'note' as const }))
)

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
        openToast('Notes uploaded successfully.', 'success', { notification: { title: 'Notes imported', category: 'upload', href: '/notes' } })
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
const quickPreviewItems = computed(() => paginatedNotes.value.map(note => ({ id: note.id, type: 'note' as const, name: note.title, size: note.size })))
</script>
