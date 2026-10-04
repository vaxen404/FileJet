<script setup lang="ts">
import SearchBox from '~/components/ui/SearchBox.vue'
import ViewSwitcher from '~/components/ui/ViewSwitcher.vue'
import UploadButton from '~/components/ui/UploadButton.vue'
import { f } from 'vue-router/dist/index-D7ja2BKs.js'

definePageMeta({
    middleware: 'auth',
    layout: 'dashboard'
})

const { toastMessage, toastType, showToast, openToast } = useToast()

const files = ref([
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 18:12'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 18:02'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 13:14'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 12:48'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 12:22'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 11:55'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 21:40'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 20:18'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 19:03'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 18:27'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 16:44'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 18:12'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 18:02'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 13:14'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 12:48'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 12:22'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 11:55'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 21:40'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 20:18'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 19:03'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 18:27'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 16:44'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 18:12'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 18:02'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 13:14'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 12:48'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 12:22'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 11:55'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 21:40'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 20:18'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 19:03'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 18:27'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 16:44'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 18:12'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 18:02'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 13:14'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 12:48'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 12:22'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 11:55'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 21:40'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 20:18'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 19:03'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 18:27'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 16:44'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 18:12'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 18:02'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 13:14'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 3, 2026 12:48'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 3, 2026 12:22'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 3, 2026 11:55'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 21:40'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 20:18'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 19:03'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB',
    modified: 'Oct 2, 2026 18:27'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB',
    modified: 'Oct 2, 2026 16:44'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB',
    modified: 'Oct 2, 2026 15:09'
  }
])

const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const activeCategory = ref('All')

const isDragging = ref(false)

const handleDrop = (event: DragEvent) => {
    isDragging.value = false
    
    const droppedFiles = event.dataTransfer?.files
    
    if (!droppedFiles) return
    
    openToast('File uploaded successfully.', 'success')
}

const filteredFiles = computed(() => {
    return files.value.filter(file => {
        const matchesCategory = 
            activeCategory.value === 'All' || 
            file.type === activeCategory.value

        const matchesSearch = 
            file.name
            .toLowerCase()
            .includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const selectedFiles = ref<string[]>([])

const allSelected = computed(() => {
    return paginatedFiles.value.length > 0 &&
        paginatedFiles.value.every(file => {
           return selectedFiles.value.includes(file.name)
        })
})

const toggleSelectAll = (event: Event) => {
    const checked = (event.target as HTMLInputElement).checked

    if (checked) {
        selectedFiles.value = paginatedFiles.value.map(file => file.name)
    } else {
        selectedFiles.value = []
    }
}

const handleFiles = (files: FileList) => {
    if (!files.length) {
        openToast('Please select a file', 'error')
        return
    }

    openToast('File selected successfully', 'success')
}

const openFile = (file: any) => {
    console.log('Open:', file.name);
}

const renameFile = (file: any) => {
    console.log('Rename:', file.name);
}

const downloadFile = (file: any) => {
    console.log("Download:", file.name);
}

const deleteFile = (file: any) => {
    console.log('Delete:', file.name);
}

const currentPage = ref(1)
const itemsPerPage = computed(() => {
    return viewMode.value === 'list' ? 12 : 20
})


const totalPages = computed(() => {
    return Math.ceil(filteredFiles.value.length / itemsPerPage.value)
})

const paginatedFiles = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value

    return filteredFiles.value.slice(start, end)
})

const visiblePages = computed(() => {
    const total = totalPages.value
    const current = currentPage.value

    if (total <= 4) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    if (current <= 3) {
        return [1, 2, 3, 4, '...']
    }

    if (current >= total - 2) {
        return ['...', total - 3, total - 2, total - 1, total]
    }

    return [
        '...',
        current - 1,
        current,
        current + 1,
        '...'
    ]
})

</script>

<template>
    <div class="files-page">
        <div class="files-header">

            <div class="files-toolbar">
                <SearchBox
                    v-model="searchQuery"
                    placeholder="Search files..."
                />

                <div class="toolbar-actions">
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton text="Upload" mode="file" @files="handleFiles"/>
                </div>
            </div>

            <div class="file-filters">
                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'All'}"
                    @click="activeCategory = 'All'"
                >
                    All
                </button>

                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'Images'}"
                    @click="activeCategory = 'Images'"
                >
                    Images
                </button>

                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'Documents'}"
                    @click="activeCategory = 'Documents'"
                >
                    Documents
                </button>

                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'Videos'}"
                    @click="activeCategory = 'Videos'"
                >
                    Videos
                </button>

                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'Compressed'}"
                    @click="activeCategory = 'Compressed'"
                >
                    Compressed
                </button>

                <button
                    class="filter-btn"
                    :class="{ active: activeCategory === 'Others'}"
                    @click="activeCategory = 'Others'"
                >
                    Others
                </button>
            </div>
        </div>

        <div
            v-if="viewMode === 'list'"
            class="files-table-wrapper"
            :class="{ 'drag-active': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
        >
            <div class="table-scroll">
                <table class="files-table">
                    <thead>
                        <tr>
                            <th>
                                <input 
                                    type="checkbox" 
                                    class="file-checkbox"
                                    :checked="allSelected"
                                    @change="toggleSelectAll"
                                >
                            </th>

                            <th>
                                <div class="name-header">
                                    Name
                                    <Icon name="solar:sort-vertical-linear" class="sort-icon" />
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
                            v-for="(file, index) in paginatedFiles"
                            :key="index"
                        >
                            <td>
                                <input 
                                    type="checkbox" 
                                    class="file-checkbox"
                                    :value="file.name"
                                    v-model="selectedFiles"
                                >
                            </td>

                            <td>
                                <div class="file-name">
                                    <div class="file-icon">
                                        <Icon :name="file.iconName" />
                                    </div>

                                    <div class="file-info">
                                        <strong>{{ file.name }}</strong>
                                        <span>{{ file.type }} • {{ file.time }}</span>
                                    </div>
                                </div>
                            </td>

                            <td>{{ file.type }}</td>
                            <td>{{ file.size }}</td>
                            <td>{{ file.modified }}</td>

                            <td>
                                <ItemMenu 
                                    type="file"
                                    @open="openFile(file)"
                                    @rename="renameFile(file)"
                                    @download="downloadFile(file)"
                                    @delete="deleteFile(file)"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div
            v-else
            class="files-grid"
        >
            <div
                v-for="(file, index) in paginatedFiles"
                :key="index"
                class="file-card"
            >
                <div class="file-card-top">
                    <div class="file-card-icon">
                        <Icon :name="file.iconName" />
                    </div>
                    
                    <ItemMenu 
                        type="file"
                        @open="openFile(file)"
                        @rename="renameFile(file)"
                        @download="downloadFile(file)"
                        @delete="deleteFile(file)"
                    />
                </div>
                    
                <div class="file-card-info">
                    <strong>{{ file.name }}</strong>
                    <span>{{ file.type }}</span>
                </div>
                
                <div class="file-card-bottom">
                    <span>{{ file.size }}</span>
                    <span>{{ file.time }}</span>
                </div>
            </div>
        </div>

        <div 
            class="pagination"
            :class="{ 'grid-pagination': viewMode === 'grid' }"
        >
            <button
                class="page-button"
                type="button"
                :disabled="currentPage === 1"
                @click="currentPage--"
            >
                <Icon name="solar:alt-arrow-left-linear" />
            </button>

            <template
                v-for="(page, index) in visiblePages"
                :key="index"
            >
                <span
                    v-if="page === '...'"
                    class="page-dots"
                >
                    ...
                </span>

                <button
                    v-else
                    class="page-button"
                    :class="{ active: currentPage === page }"
                    type="button"
                    @click="currentPage = Number(page)"
                >
                    {{ page }}
                </button>
            </template>

            <button
                class="page-button"
                type="button"
                :disabled="currentPage === totalPages"
                @click="currentPage++"
            >
                <Icon name="solar:alt-arrow-right-linear" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.files-page {
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

.files-header {
    display: flex;
    flex-direction: column;

    flex-shrink: 0;

    padding: 0 0.5rem;
}

.files-toolbar {
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

.file-filters {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 0.5rem;

    margin-bottom: 1rem;
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

.files-table-wrapper {
    position: relative;

    flex: 1;
    min-height: 0;

    display: flex;
    flex-direction: column;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-top-left-radius: 0.625rem;
    border-top-right-radius: 0.625rem;

    overflow: hidden;

    box-sizing: border-box;
}

.files-table-wrapper.drag-active::after {
    content: 'Drop files to upload';

    position: absolute;

    inset: 0;

    display: flex;

    align-items: center;
    justify-content: center;

    background: #121214e0;

    border: 2px dashed #5a5aff;
    border-radius: 0.8rem;

    color: white;

    font-size: 1.2rem;
    font-weight: 600;

    z-index: 20;

    pointer-events: none;
}

.table-scroll {
    flex: 1;
    min-height: 0;

    overflow-y: auto;
    overflow-x: hidden;
}

.files-table {
    width: 100%;

    border-collapse: separate;
    border-spacing: 0;

    background: transparent;

    border: none;
    border-radius: 0;
}

.files-table th,
.files-table td {
    padding: 0 1rem;

    text-align: left;
    vertical-align: middle;

    border-bottom: 1px solid #29292e;

    box-sizing: border-box;
}

.files-table thead th {
    height: 3.8rem;

    position: sticky;

    top: 0;

    z-index: 2;

    background: #1a1a1d;

    color: #a3a3ab;

    font-size: 0.8rem;
    font-weight: 500;
}

.files-table tbody td {
    height: 4.2rem;

    color: #b5b5bd;

    font-size: 0.85rem;
}

.files-table tbody tr:hover {
    background: #1f1f23;
}

.files-table th:first-child,
.files-table td:first-child {
    width: 3.5rem;

    padding-left: 1rem;
    padding-right: 0.75rem;

    text-align: center;
}

.file-checkbox {
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

.file-checkbox:checked {
    background: #3c47be;

    border-color: #3c47be;
}

.file-checkbox:checked::after {
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

.files-table th:nth-child(2),
.files-table td:nth-child(2) {
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

.file-name {
    display: flex;

    align-items: center;

    gap: 0.8rem;
}

.file-icon {
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

.file-info {
    display: flex;

    flex-direction: column;

    gap: 0.2rem;

    min-width: 0;
}

.file-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;

    white-space: nowrap;
}

.file-info span {
    color: #898991;

    font-size: 0.75rem;

    white-space: nowrap;
}

.file-menu {
    background: transparent;

    border: none;

    color: #a8a8b0;

    font-size: 1.1rem;

    transform: rotate(90deg);
}

.pagination {
    height: 4rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    gap: 0.45rem;

    background: #1a1a1d;

    border-top: 1px solid #29292e;
    border-bottom-left-radius: 0.625rem;
    border-bottom-right-radius: 0.625rem;
}

.grid-pagination {
    height: 3.5rem;

    background: transparent;

    border-top: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;

    margin-top: 0.75rem;
}

.page-button {
    width: 2.2rem;
    height: 2.2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #1a1a1d;

    color: #a8a8b0;

    border: 1px solid #29292e;
    border-radius: 0.5rem;

    font-size: 0.82rem;
    font-weight: 500;

    cursor: pointer;
}

.page-button:hover:not(:disabled) {
    background: #242429;

    color: #ffffff;
}

.page-button.active {
    background: #3c47be;

    color: #ffffff;

    border-color: #3c47be;
}

.page-button:disabled {
    opacity: 0.35;

    cursor: default;
}

.page-dots {
    min-width: 1.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #898991;
}

.files-grid {
    flex: 1;
    min-height: 0;
    
    display: grid;

    grid-template-columns: repeat(5, 1fr);

    align-content: start;

    gap: 1rem;

    overflow-y: auto;
}

@media (max-width: 1500px) {
    .files-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

.file-card {
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

.file-card:hover {
    background: #1f1f23;

    border-color: #35353c;
}

.file-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.file-card-icon {
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

.file-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.file-card-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.file-card-info span {
    color: #898991;

    font-size: 0.75rem;
}

.file-card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;

    color: #898991;

    font-size: 0.75rem;
}
</style>