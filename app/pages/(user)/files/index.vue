<template>
    <div class="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div class="mb-3 flex shrink-0 flex-col gap-3">
            <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <SearchBox
                    v-model="searchQuery"
                    class="files-search max-w-lg grow basis-72 max-tablet:basis-full max-tablet:max-w-none"
                    placeholder="Search files..."
                />

                <div class="flex min-w-0 flex-wrap items-center gap-2 max-tablet:w-full max-tablet:justify-between">
                    <ViewSwitcher v-model="viewMode" />
                    <UploadButton
                        text="Upload"
                        mode="file"
                        @files="handleFiles"
                    />
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <ItemFilters
                    v-model="activeCategory"
                    :options="filterOptions"
                />

                <SortDropdown v-model="sortMode" />
            </div>
        </div>

        <DataView
            :view-mode="viewMode"
            :is-loading="isInitialLoading"
            drop-text="Drop files to upload"
            @drop="handleDrop"
        >
            <template #loading>
                <div class="loading-state text-label text-[0.85rem]">Loading files...</div>
            </template>
            <template
                v-if="!isInitialLoading && filteredFiles.length === 0"
                #empty
            >
                <div class="empty-state w-full min-h-48 py-8 px-4 flex flex-col items-center justify-center gap-2 text-center">
                    <Icon
                        name="solar:file-bold"
                        size="2.5rem"
                        class="empty-state-icon block shrink-0 mb-2 text-accent text-[2.5rem]"
                    />
                    <strong class="text-foreground text-sm font-semibold leading-normal">{{
                        error
                            ? 'Unable to load files'
                            : files.length
                              ? 'No matching files'
                              : 'No files yet'
                    }}</strong>
                    <span class="empty-state-description text-muted text-sm font-normal leading-normal">{{
                        error ||
                        (files.length
                            ? 'Try a different search or filter.'
                            : 'Upload your first file to get started.')
                    }}</span>
                </div>
            </template>

            <template #list>
                <div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <table
                        class="mobile-item-table files-table w-full border-separate border-spacing-0"
                    >
                        <thead>
                            <tr>
                                <th class="w-14 pr-3 text-center file-table-heading">
                                    <input
                                        type="checkbox"
                                        class="file-checkbox"
                                        :checked="allSelected"
                                        :indeterminate="partiallySelected"
                                        :disabled="isLoading || isBulkDeleting"
                                        @change="toggleSelectAll"
                                    />
                                </th>

                                <th class="w-[42%] file-table-heading">
                                    <div class="flex items-center gap-[0.3rem]">
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

                        <tbody class="text-secondary text-[0.85rem]">
                            <tr class="transition-colors duration-200 ease-[ease]"
                                v-for="file in paginatedFiles"
                                :key="file.id"
                                :class="selectedFiles.includes(file.id)
                                    ? 'bg-accent/12 text-content hover:bg-accent/18'
                                    : 'hover:bg-surface-hover'"
                                @click="openFile(file)"
                                @contextmenu.prevent.stop="openContextMenu($event, file.id)"
                            >
                                <td class="item-selection-cell h-[4.2rem] w-14 pr-3 text-center file-table-cell" @click.stop>
                                    <input
                                        v-model="selectedFiles"
                                        type="checkbox"
                                        class="file-checkbox"
                                        :value="file.id"
                                        :disabled="isLoading || isBulkDeleting"
                                    />
                                </td>

                                <td class="item-name-cell h-[4.2rem] w-[42%] file-table-cell">
                                    <div class="flex items-center gap-3">
                                        <div class="mobile-list-preview">
                                            <img
                                                v-if="file.mime_type?.startsWith('image/')"
                                                :src="`/api/files/${file.id}/preview`"
                                                :alt="file.name"
                                                loading="lazy"
                                            />
                                            <template v-else-if="file.mime_type?.startsWith('video/')">
                                                <video
                                                    :src="`/api/files/${file.id}/preview`"
                                                    preload="metadata"
                                                    muted
                                                    playsinline
                                                />
                                                <Icon class="mobile-list-play" name="solar:play-bold" />
                                            </template>
                                            <Icon v-else :name="getFileIcon(file.mime_type, file.original_name)" />
                                        </div>
                                        <div
                                            class="file-icon flex shrink-0 items-center justify-center rounded-md text-on-primary text-[1.15rem]
                                            size-[2.4rem]"
                                            :class="selectedFiles.includes(file.id) ? 'bg-primary/80' : 'bg-primary'"
                                        >
                                            <Icon
                                                :name="
                                                    getFileIcon(file.mime_type, file.original_name)
                                                "
                                            />
                                        </div>

                                        <div class="flex min-w-0 flex-col gap-1">
                                            <input
                                                type="text"
                                                class="list-name-input w-lg min-w-0 max-w-full text-ellipsis whitespace-nowrap rounded-control border
                                                bg-transparent text-sm leading-normal font-semibold text-foreground outline-none
                                                disabled:pointer-events-none border-transparent is-active:py-[0.2rem] is-active:px-[0.4rem]
                                                is-active:border-primary"
                                                :data-file-id="file.id"
                                                :class="{ active: editingFileId === file.id }"
                                                :value="
                                                    editingFileId === file.id
                                                        ? editingFileName
                                                        : file.name
                                                "
                                                :disabled="editingFileId !== file.id"
                                                @input="
                                                    editingFileName = (
                                                        $event.target as HTMLInputElement
                                                    ).value
                                                "
                                                @keyup.enter="saveRename(file)"
                                                @blur="
                                                    editingFileId === file.id && saveRename(file)
                                                "
                                                @click.stop
                                            />
                                            <span class="whitespace-nowrap text-xs leading-normal text-muted">
                                                {{ formatFileSize(file.size) }} •
                                                {{ formatFileTime(file.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td data-label="Type" class="item-meta-cell h-[4.2rem] file-table-cell">{{ getFileType(file.original_name) }}</td>
                                <td data-label="Size" class="item-meta-cell h-[4.2rem] file-table-cell">{{ formatFileSize(file.size) }}</td>
                                <td data-label="Modified" class="item-meta-cell h-[4.2rem] file-table-cell">{{ formatFileTime(file.updated_at) }}</td>

                                <td class="item-actions-cell h-[4.2rem] file-table-cell" @click.stop>
                                    <ItemMenu
                                        :ref="menu => setFileMenuRef(file.id, menu)"
                                        type="file"
                                        :is-favorite="isFileFavorite(file.id)"
                                        :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                        @open="openFile(file)"
                                        @download="handleDownload(file.id)"
                                        @rename="startRename(file)"
                                        @copy="handleCopy(file.id)"
                                        @favorite="handleFavorite(file)"
                                        @delete="handleDelete(file.id)"
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
                        v-for="file in paginatedFiles"
                        :key="file.id"
                        class="file-grid-card group/file-grid-card"
                        :selected="selectedFiles.includes(file.id)"
                        :title="file.name"
                        :icon="getFileIcon(file.mime_type, file.original_name)"
                        @click="openFile(file)"
                        @contextmenu.prevent.stop="openContextMenu($event, file.id)"
                    >
                        <template
                            v-if="
                                file.mime_type?.startsWith('image/') ||
                                file.mime_type?.startsWith('video/')
                            "
                            #preview
                        >
                            <div
                                v-if="file.mime_type?.startsWith('video/')"
                                class="video-play-icon pointer-events-none absolute top-1/2 left-1/2 z-1 grid size-12 -translate-x-1/2
                                -translate-y-1/2 place-items-center rounded-full bg-black/65 text-on-primary text-[1.4rem]
                                group-hover/file-grid-card:bg-[rgba(60,_71,_190,_0.9)]"
                            >
                                <Icon name="solar:play-bold" />
                            </div>
                            <img
                                v-if="file.mime_type?.startsWith('image/')"
                                :src="`/api/files/${file.id}/preview`"
                                :alt="file.name"
                                loading="lazy"
                                class="file-preview-image object-cover block transition-transform duration-250 ease-[ease]
                                group-hover/file-card:scale-[1.035] size-full"
                            />
                            <video
                                v-else
                                :src="`/api/files/${file.id}/preview`"
                                class="file-preview-image object-cover block transition-transform duration-250 ease-[ease]
                                group-hover/file-card:scale-[1.035] size-full"
                                preload="metadata"
                                muted
                                playsinline
                            />
                        </template>
                        <template #actions>
                            <label class="file-select flex items-center justify-center bg-selection-surface border border-selection-border rounded-full
                                cursor-pointer size-8">
                                <input
                                    class="file-checkbox m-0 accent-accent cursor-pointer size-[1.1rem]"
                                    v-model="selectedFiles"
                                    type="checkbox"
                                    :value="file.id"
                                    :disabled="isLoading || isBulkDeleting"
                                />
                            </label>
                            <ItemMenu
                                :ref="menu => setFileMenuRef(file.id, menu)"
                                type="file"
                                :is-favorite="isFileFavorite(file.id)"
                                :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                @open="openFile(file)"
                                @download="handleDownload(file.id)"
                                @rename="startRename(file)"
                                @copy="handleCopy(file.id)"
                                @favorite="handleFavorite(file)"
                                @delete="handleDelete(file.id)"
                            />
                        </template>
                        <template #title>
                            <input
                                type="text"
                                class="file-name-input grid-name-input"
                                :data-file-id="file.id"
                                :class="{ active: editingFileId === file.id }"
                                :value="editingFileId === file.id ? editingFileName : file.name"
                                :disabled="editingFileId !== file.id"
                                @input="editingFileName = ($event.target as HTMLInputElement).value"
                                @keyup.enter="saveRename(file)"
                                @blur="editingFileId === file.id && saveRename(file)"
                                @click.stop
                            />
                        </template>
                        <template #metadata>
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">{{ formatFileSize(file.size) }}</span>
                            ·
                            <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap first:shrink-0">{{ formatFileTime(file.created_at) }}</span>
                        </template>
                    </ItemGridCard>
                </ItemGrid>
            </template>
        </DataView>
        <UploadProgress
            :active="isUploading"
            :progress="uploadProgress"
            :processing="isProcessing"
        />

        <Pagination
            v-model="currentPage"
            :total-pages="totalPages"
            :view-mode="viewMode"
        />
        <SelectionToolbar
            :items="selectionItems"
            :busy="pending || isLoading || isBulkDeleting"
            :current-folder-id="null"
            @clear="selectedFiles = []"
            @delete="handleDeleteSelected"
            @moved="handleSelectionMoved"
        />
    </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type ItemMenu from '~/components/ui/ItemMenu.vue'
import {
    canCopyFile,
    getFileIcon,
    getFileType,
    getFileCategory,
    formatFileSize,
    formatFileTime
} from '~/utils/file'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

const { openToast } = useToast()

const {
    isLoading,
    isUploading,
    isProcessing,
    uploadProgress,
    uploadFiles,
    deleteFile,
    deleteFiles,
    renameFile,
    copyFile,
    downloadFile
} = useFileActions()

const { addFavorite, removeFavorite } = useFavoriteActions()

const { files, favorites, pending, error, fetchAll } = useUser()

const isInitialLoading = computed(
    () => pending.value && files.value.length === 0 && !isUploading.value
)

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const activeCategory = ref('All')
const filterOptions = ['All', 'Images', 'Documents', 'Videos', 'Compressed', 'Others']

const fileMenus = new Map<string, InstanceType<typeof ItemMenu>>()

const setFileMenuRef = (fileId: string, menu: Element | ComponentPublicInstance | null) => {
    if (menu) fileMenus.set(fileId, menu as InstanceType<typeof ItemMenu>)
    else fileMenus.delete(fileId)
}

const openContextMenu = (event: MouseEvent, fileId: string) => {
    fileMenus.get(fileId)?.openAt(event.clientX, event.clientY)
}

const editingFileId = ref<string | null>(null)
const editingFileName = ref('')

const startRename = async (file: any) => {
    editingFileId.value = file.id
    editingFileName.value = file.name

    await nextTick()

    const input = document.querySelector(`[data-file-id="${file.id}"]`) as HTMLInputElement | null

    input?.focus()
    input?.select()
}

const handleDrop = (event: DragEvent) => {
    const droppedFiles = event.dataTransfer?.files

    if (droppedFiles?.length) return handleFiles(droppedFiles)
}

const filteredFiles = computed(() => {
    return files.value.filter(file => {
        const matchesCategory =
            activeCategory.value === 'All' ||
            getFileCategory(file.original_name) === activeCategory.value

        const matchesSearch = file.name.toLowerCase().includes(searchQuery.value.toLowerCase())

        return matchesCategory && matchesSearch
    })
})

const sortMode = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')
const { itemsPerPage } = useBrowsePreferences(viewMode, sortMode)

const { sortedItems: sortedFiles } = useSort(
    filteredFiles,
    sortMode,
    file => file.name,
    file => file.created_at
)

const handleFiles = async (files: FileList) => {
    if (!files.length) {
        openToast('Please select a file', 'error', { notification: false })

        return
    }

    try {
        await uploadFiles(files, async () => {
            await fetchAll()

            if (error.value) throw new Error(error.value)
        })

        openToast('File uploaded successfully.', 'success', { notification: { title: 'Upload complete', category: 'upload', href: '/files' } })
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File upload failed.', 'error')
    }
}

const openFile = (file: any) => {
    navigateTo(`/files/${file.id}`)
}

const saveRename = async (file: any) => {
    const newName = editingFileName.value?.trim()

    if (!newName || newName === file.name) {
        editingFileId.value = null

        return
    }

    try {
        await renameFile(file.id, newName)
        await fetchAll()

        editingFileId.value = null

        openToast('File renamed successfully', 'success', { notification: { title: 'File renamed', category: 'library', href: '/files' } })
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be renamed.', 'error')
    }
}

const handleCopy = async (fileId: string) => {
    try {
        const file = files.value.find(file => file.id === fileId)

        if (!file) throw new Error('File not found.')

        await copyFile(file)
        openToast('Copied to clipboard.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be copied to the clipboard.',
            'error'
        )
    }
}

const handleDownload = async (fileId: string) => {
    try {
        await downloadFile(fileId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be downloaded.', 'error')
    }
}

const handleDelete = async (fileId: any) => {
    if (isLoading.value || isBulkDeleting.value) return

    try {
        await deleteFile(fileId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be deleted.', 'error')
    }
}

const isFileFavorite = (fileId: string) => {
    return favorites.value.some(favorite => {
        return favorite.file_id === fileId
    })
}

const handleFavorite = async (file: any) => {
    try {
        if (isFileFavorite(file.id)) {
            await removeFavorite(file.id, 'file')
            await fetchAll()

            openToast('File removed from favorites.', 'success')

            return
        }

        await addFavorite(file.id, 'file')
        await fetchAll()

        openToast('File favorited successfully.', 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be favorited', 'error')
    }
}

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedFiles
} = usePagination(sortedFiles, itemsPerPage)

const { selectedItems: selectedFiles, allSelected, toggleSelectAll } = useSelection(paginatedFiles)

const selectionItems = computed(() =>
    selectedFiles.value.map(id => ({ id, type: 'file' as const }))
)

const handleSelectionMoved = async () => {
    selectedFiles.value = []
    await fetchAll()

    if (error.value) openToast(error.value, 'error')
}

const isBulkDeleting = ref(false)

const partiallySelected = computed(
    () =>
        !allSelected.value &&
        paginatedFiles.value.some(file => selectedFiles.value.includes(file.id))
)

const handleDeleteSelected = async () => {
    if (!selectedFiles.value.length || isLoading.value || isBulkDeleting.value) return

    isBulkDeleting.value = true

    try {
        const result = await deleteFiles([...selectedFiles.value])
        const deletedIds = new Set(result.deletedIds)

        selectedFiles.value = selectedFiles.value.filter(id => !deletedIds.has(id))
        files.value = files.value.filter(file => !deletedIds.has(file.id))

        if (result.failedIds.length) {
            openToast(`${result.failedIds.length} items could not be moved to Trash.`, 'error')
        }
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'Selected files could not be deleted.',
            'error'
        )
    } finally {
        isBulkDeleting.value = false
    }
}

watch(files, items => {
    const availableIds = new Set(items.map(file => file.id))
    selectedFiles.value = selectedFiles.value.filter(id => availableIds.has(id))
})

watch(totalPages, total => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, total))
})

watch([searchQuery, activeCategory, sortMode, viewMode], () => {
    currentPage.value = 1
})
</script>
