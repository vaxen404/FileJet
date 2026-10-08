<script setup lang="ts">

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { toastMessage, toastType, showToast, openToast } = useToast()

const notes = ref([
    {
        title: 'Project Ideas',
        description: 'Web app ideas, features, tech stack...',
        type: 'Note',
        size: '4.2 KB',
        modified: 'Oct 3, 2026 18:12',
        time: '2 minutes ago',
        iconName: 'solar:notebook-bold'
    },
    {
        title: 'Study Plan',
        description: 'English, Nuxt, TypeScript, Projects...',
        type: 'Note',
        size: '2.8 KB',
        modified: 'Oct 3, 2026 17:45',
        time: '15 minutes ago',
        iconName: 'solar:notebook-bold'
    },
    {
        title: 'important-links.txt',
        description: 'Useful resources for development...',
        type: 'TXT',
        size: '1.2 KB',
        modified: 'Oct 3, 2026 16:30',
        time: '1 hour ago',
        iconName: 'solar:document-text-bold'
    },
    {
        title: 'Todo List',
        description: 'Things to do this week...',
        type: 'Note',
        size: '3.1 KB',
        modified: 'Oct 2, 2026 20:40',
        time: '1 day ago',
        iconName: 'solar:checklist-bold'
    },
    {
        title: 'readme.md',
        description: 'Project documentation...',
        type: 'MD',
        size: '6.7 KB',
        modified: 'Oct 1, 2026 19:20',
        time: '2 days ago',
        iconName: 'solar:document-text-bold'
    }
])

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const activeCategory = ref('All')


const isDragging = ref(false)

const handleDrop = (event: DragEvent) => {
    isDragging.value = false

    const droppedNotes = event.dataTransfer?.files

    if (!droppedNotes) return

    openToast('Note uploaded sucessfully', 'success')
}

const filteredNotes = computed(() => {
    return notes.value.filter(note => {
        const matchesCategory = 
            activeCategory.value === 'All' ||
            note.type === activeCategory.value

        const matchesSearch = 
            note.title
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const selectedNotes = ref<string[]>([])

const allSelected = computed(() => {
    return paginatedNotes.value.length > 0 &&
        paginatedNotes.value.every(note => {
            return selectedNotes.value.includes(note.title)
        })
})

const toggleSelectAll = (event: Event) => {
    const checked = (event.target as HTMLInputElement).checked

    if (checked) {
        selectedNotes.value = paginatedNotes.value.map(note => note.title)
    } else {
        selectedNotes.value = []
    }
}

const handleNoteUpload = () => {
    openToast('Note uploaded successfully.', 'success')
}

const openNote = (note: any) => {
    console.log('Open:', note.title);
}

const editNote = (note: any) => {
    console.log('Edit:', note.title);
}

const downloadNote = (note: any) => {
    console.log("Download:", note.title);
}

const renameNote = (note: any) => {
    console.log("Rename:", note.title);
}

const favoriteNote = (note: any) => {
    console.log('Favorite:', note.title);
}

const deleteNote = (note: any) => {
    console.log('Delete:', note.title);
}

const currentPage = ref(1)
const itemsPerPage = 12

const totalPages = computed(() => {
    return Math.ceil(filteredNotes.value.length / itemsPerPage)
})

const paginatedNotes = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage

    return filteredNotes.value.slice(start, end)
})

watch([searchQuery, activeCategory], () => {
    currentPage.value = 1
})
</script>

<template>
    <div class="notes-page">
        <div class="notes-header">
            <div class="notes-toolbar">
                <SearchBox 
                    v-model="searchQuery"
                    placeholder="Search notes..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton text="Upload" mode="file" @files="handleNoteUpload"/>


                    <button
                        type="button"
                        class="new-note-button"
                    >
                        <Icon name="solar:add-circle-bold" />
                        New Note
                    </button>
                </div>
            </div>

            <div class="notes-filters">
                <button
                    type="button"
                    class="filter-button"
                    :class="{ active: activeCategory === 'All' }"
                    @click="activeCategory = 'All'"
                >
                    All
                </button>

                <button
                    type="button"
                    class="filter-button"
                    :class="{ active: activeCategory === 'Note' }"
                    @click="activeCategory = 'Note'"
                >
                    Notes
                </button>

                <button
                    type="button"
                    class="filter-button"
                    :class="{ active: activeCategory === 'TXT' }"
                    @click="activeCategory = 'TXT'"
                >
                    TXT
                </button>

                <button
                    type="button"
                    class="filter-button"
                    :class="{ active: activeCategory === 'MD' }"
                    @click="activeCategory = 'MD'"
                >
                    MD
                </button>

                <button
                    type="button"
                    class="filter-button"
                    :class="{ active: activeCategory === 'PDF' }"
                    @click="activeCategory = 'PDF'"
                >
                    PDF
                </button>
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-dragging="isDragging"
            drop-text="Drop notes to upload"
            @dragover="isDragging = true"
            @dragleave="isDragging = false"
            @drop="handleDrop"
        >
            <template v-if="notes.length === 0" #empty>
                <div class="empty-state">
                    <Icon name="solar:notebook-linear" size="2.5rem" class="empty-state-icon" />
                    <strong>No notes yet</strong>
                    <span class="empty-state-description">Create your first note to get started.</span>
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
                                        class="notes-checkbox"
                                        :checked="allSelected"
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
                                v-for="(note, index) in paginatedNotes"
                                :key="index"
                            >
                                <td>
                                    <input 
                                        v-model="selectedNotes"
                                        type="checkbox"
                                        class="note-checkbox"
                                        :value="note.title"
                                    >
                                </td>

                                <td>
                                    <div class="note-name">
                                        <div class="note-icon">
                                            <Icon :name="note.iconName" />
                                        </div>

                                        <div class="note-info">
                                            <strong>{{ note.title }}</strong>
                                            <span>
                                                {{ note.size }} • {{ note.time }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>{{ note.type }}</td>
                                <td>{{ note.size }}</td>
                                <td>{{ note.modified }}</td>

                                <td>
                                    <ItemMenu
                                        :type="note.type === 'Note' ? 'note' : 'file'"
                                        :actions="['open', 'edit', 'download', 'favorite', 'delete']"
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
                    v-for="(note, index) in paginatedNotes"
                    :key="index"
                    class="note-card"
                >
                    <div class="note-card-top">
                        <div class="note-card-icon">
                            <Icon :name="note.iconName" />
                        </div>

                        <ItemMenu
                            :type="note.type === 'Note' ? 'note' : 'file'"
                            :actions="['open', 'edit', 'download', 'favorite', 'delete']"
                            @open="openNote(note)"
                            @edit="editNote(note)"
                            @rename="renameNote(note)"
                            @download="downloadNote(note)"
                            @favorite="favoriteNote(note)"
                            @delete="deleteNote(note)"
                        />
                    </div>

                    <div class="note-card-info">
                        <strong>{{ note.title }}</strong>
                        <span>{{ note.type }}</span>
                    </div>

                    <div class="note-card-bottom">
                        <span>{{ note.size }}</span>
                        <span>{{ note.time }}</span>
                    </div>
                </div>
            </template>
        </DataView>
        

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
        />
    </div>
</template>

<style scoped>
.notes-page {
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

.notes-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0 0.5rem;
}

.notes-toolbar {
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

.notes-filters {
    display: flex;
    align-items: center;

    gap: 0.5rem;

    margin-bottom: 1rem;
}

.filter-button {
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

.filter-button:hover {
    color: #ffffff;

    background: #242429;

    border-color: #35353c;
}

.filter-button.active {
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

.notes-checkbox,
.note-checkbox {
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

.notes-checkbox:checked,
.note-checkbox:checked {
    background: #3c47be;

    border-color: #3c47be;
}

.notes-checkbox:checked::after,
.note-checkbox:checked::after {
    content: '✓';

    width: 100%;
    height: 100%;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #ffffff;

    font-size: 0.7rem;
    font-weight: 700;
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
</style>
