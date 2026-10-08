<script setup lang="ts">
definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()

const folders = ref([
    {
        name: 'Projects',
        items: 12,
        type: 'Folder',
        modified: 'Oct 3, 2026 18:12',
        time: '2 minutes ago',
        iconName: 'solar:folder-bold'
    },
    {
        name: 'Documents',
        items: 24,
        type: 'Folder',
        modified: 'Oct 3, 2026 17:45',
        time: '15 minutes ago',
        iconName: 'solar:folder-bold'
    },
    {
        name: 'Images',
        items: 42,
        type: 'Folder',
        modified: 'Oct 3, 2026 16:30',
        time: '1 hour ago',
        iconName: 'solar:folder-bold'
    },
    {
        name: 'Videos',
        items: 18,
        type: 'Folder',
        modified: 'Oct 3, 2026 14:10',
        time: '3 hours ago',
        iconName: 'solar:folder-bold'
    },
    {
        name: 'Work',
        items: 14,
        type: 'Folder',
        modified: 'Oct 2, 2026 20:40',
        time: '1 day ago',
        iconName: 'solar:folder-bold'
    },
    {
        name: 'Personal',
        items: 9,
        type: 'Folder',
        modified: 'Oct 1, 2026 19:20',
        time: '2 days ago',
        iconName: 'solar:folder-bold'
    }
])

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')

const isDragging = ref(false)

const handleDrop = (event: DragEvent) => {
    isDragging.value = false
    
    const droppedFolders = event.dataTransfer?.files
    
    if (!droppedFolders) return
    
    openToast('Folder uploaded successfully.', 'success')
}

const filteredFolders = computed(() => {
    return folders.value.filter(folder => {
        const matchesSearch = 
            folder.name
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())

        return matchesSearch
    })

})

const selectedFolders = ref<string[]>([])

const allSelected = computed(() => {
    return paginatedFolders.value.length > 0 &&
        paginatedFolders.value.every(folder => {
            return selectedFolders.value.includes(folder.name)
        })
})

const toggleSelectAll = (event: Event) => {
    const checked = (event.target as HTMLInputElement).checked

    if (checked) {
        selectedFolders.value = paginatedFolders.value.map(folder => folder.name)
    }else {
        selectedFolders.value = []
    }
}

const handleFolders = (folders: any) => {
    const files = Array.from(folders) as File[]

    const isFolderUpload = files.every(file => file.webkitRelativePath)

    if (!isFolderUpload) {
        openToast('Please select a folder.', 'error')
        return
    }

    openToast('Folder selected successfully.', 'success')
}

const openFolder = (folder: any) => {
    console.log('Open:', folder.name);
}

const downloadFolder = (folder: any) => {
    console.log('Download:', folder.name);
}

const renameFolder = (folder: any) => {
    console.log('Rename:', folder.name);
}

const favoriteFolder = (folder: any) => {
    console.log('Favorite:', folder.name);
}

const deleteFolder = (folder: any) => {
    console.log('Delete:', folder.name);
}

const currentPage = ref(1)
const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})

const totalPages = computed(() => {
    return Math.ceil(filteredFolders.value.length / itemsPerPage.value)
})

const paginatedFolders = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value

    return filteredFolders.value.slice(start, end)
})

watch(searchQuery, () => {
    currentPage.value = 1
})
</script>

<template>
    <div class="folders-page">
        <div class="folders-header">
            <div class="folders-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search folders..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />

                    <UploadButton
                        text="Upload"
                        mode="folder"
                        @folder="handleFolders"
                    />
                </div>
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-dragging="isDragging"
            drop-text="Drop folders to upload"
            @dragover="isDragging = true"
            @dragleave="isDragging = false"
            @drop="handleDrop"
        >
            <template v-if="folders.length === 0" #empty>
                <div class="empty-state">
                    <Icon name="solar:folder-linear" size="2.5rem" class="empty-state-icon empty-state-folder-icon" />
                    <strong>No folders yet</strong>
                    <span class="empty-state-description">Create your first folder to organize your files.</span>
                </div>
            </template>

            <template #list>
                <div class="table-scroll">
                    <table class="folders-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        class="folder-checkbox"
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
                                <th>Items</th>
                                <th>Modified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="(folder, index) in paginatedFolders"
                                :key="index"
                            >
                                <td>
                                    <input
                                        v-model="selectedFolders"
                                        type="checkbox"
                                        class="folder-checkbox"
                                        :value="folder.name"
                                    >
                                </td>

                                <td>
                                    <div class="folder-name">
                                        <div class="folder-icon">
                                            <Icon :name="folder.iconName" />
                                        </div>

                                        <div class="folder-info">
                                            <strong>{{ folder.name }}</strong>
                                            <span>
                                                {{ folder.items }} • {{ folder.time }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>{{ folder.type }}</td>
                                <td>{{ folder.items }}</td>
                                <td>{{ folder.modified }}</td>

                                <td>
                                    <ItemMenu
                                        type="folder"
                                        :actions="['open', 'download', 'rename', 'favorite', 'delete']"
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
                <div
                    v-for="(folder, index) in paginatedFolders"
                    :key="index"
                    class="folder-card"
                >
                    <div class="folder-card-top">
                        <div class="folder-card-icon">
                            <Icon :name="folder.iconName" />
                        </div>

                        <ItemMenu
                            type="folder"
                            :actions="['open', 'download', 'rename', 'favorite', 'delete']"
                            @open="openFolder(folder)"
                            @download="downloadFolder(folder)"
                            @rename="renameFolder(folder)"
                            @favorite="favoriteFolder(folder)"
                            @delete="deleteFolder(folder)"
                        />
                    </div>

                    <div class="folder-card-info">
                        <strong>{{ folder.name }}</strong>
                        <span>{{ folder.type }}</span>
                    </div>

                    <div class="folder-card-bottom">
                        <span>{{ folder.items }} Items</span>
                        <span>{{ folder.time }}</span>
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
.folders-page {
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

.folders-header  {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0 0.5rem;
}

.folders-toolbar {
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

.table-scroll {
    flex: 1;
    min-height: 0;

    overflow-y: auto;
    overflow-x: hidden;
}

.folders-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
    border-radius: 0;
}

.folders-table th,
.folders-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.folders-table thead th {
    height: 3.8rem;

    position: sticky;

    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.folders-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.folders-table tbody tr:hover {
    background: #1f1f23;
}

.folders-table th:first-child,
.folders-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.folder-checkbox {
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

.folder-checkbox:checked {
    background: #3c47be;

    border-color: #3c47be;
}

.folder-checkbox:checked::after {
    content: '✓';

    display: flex;

    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;

    color: #ffffff;

    font-size: 0.7rem;
    font-weight: 700;
}

.folders-table th:nth-child(2),
.folders-table td:nth-child(2) {
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

.folder-name {
    display: flex;

    align-items: center;
    
    gap: 0.8rem;
}

.folder-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    color: #6ea8ff;
    background: #1f2d4a;

    border: 1px solid #2f4770;
    border-radius: 0.55rem;

    font-size: 1.2rem;
}

.folder-info {
    display: flex;

    flex-direction: column;

    gap: 0.2rem;

    min-width: 0;
}

.folder-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
}

.folder-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.folder-card {
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

.folder-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.folder-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.folder-card-icon {
    width: 2.7rem;
    height: 2.7rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #6ea8ff;
    background: #1f2d4a;

    border: 1px solid #2f4770;
    border-radius: 0.55rem;

    font-size: 1.25rem;
}

.folder-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.folder-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.folder-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.folder-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}
</style>
