<template>
    <div class="dashboard-page flex flex-col gap-3 size-full">
        <section class="stats-grid grid grid-cols-[repeat(3,_1fr)] max-mobile:grid-cols-1 gap-3 shrink-0">
            <div class="stat-card min-h-32 flex items-center gap-4 p-4 bg-surface border border-divider rounded-3xl">
                <div class="stat-icon purple-bg flex items-center justify-center text-accent bg-accent/12 rounded-[0.675rem]
                    text-[1.6rem] size-[3.4rem]">
                    <Icon
                        name="solar:document-linear"
                        aria-hidden="true"
                    />
                </div>

                <div class="stat-info flex flex-col gap-[0.2rem]">
                    <strong class="text-foreground text-[1.7rem] font-bold">{{ files.length }}</strong>
                    <span class="text-muted text-[0.9rem]">Files</span>
                </div>
                <p class="stat-description hidden">Uploaded files</p>
            </div>

            <div class="stat-card min-h-32 flex items-center gap-4 p-4 bg-surface border border-divider rounded-3xl">
                <div class="stat-icon blue-bg flex items-center justify-center text-accent bg-accent/12 rounded-[0.675rem]
                    text-[1.6rem] size-[3.4rem]">
                    <Icon
                        name="solar:folder-linear"
                        aria-hidden="true"
                    />
                </div>

                <div class="stat-info flex flex-col gap-[0.2rem]">
                    <strong class="text-foreground text-[1.7rem] font-bold">{{ folders.length }}</strong>
                    <span class="text-muted text-[0.9rem]">Folders</span>
                </div>
                <p class="stat-description hidden">Created folders</p>
            </div>

            <div class="stat-card min-h-32 flex items-center gap-4 p-4 bg-surface border border-divider rounded-3xl">
                <div class="stat-icon flex items-center justify-center text-accent bg-accent/12 rounded-[0.675rem]
                    text-[1.6rem] size-[3.4rem]">
                    <Icon
                        name="solar:notebook-linear"
                        aria-hidden="true"
                    />
                </div>

                <div class="stat-info flex flex-col gap-[0.2rem]">
                    <strong class="text-foreground text-[1.7rem] font-bold">{{ notes.length }}</strong>
                    <span class="text-muted text-[0.9rem]">Notes</span>
                </div>
                <p class="stat-description hidden">Saved notes</p>
            </div>
        </section>

        <section class="dashboard-grid grid grid-cols-[minmax(0,_1.85fr)_minmax(0,_1.15fr)] gap-3 flex-1 min-h-0">
            <div class="dashboard-left flex flex-col min-w-0 h-full min-h-0">
                <div class="dashboard-card h-full flex flex-col min-h-0 bg-surface border border-divider rounded-3xl
                    overflow-hidden">
                    <div class="card-header flex items-center justify-between p-4 shrink-0">
                        <h2 class="m-0 text-foreground text-lg font-semibold leading-tight">Recent Files</h2>

                        <NuxtLink class="flex items-center gap-[0.3rem] text-accent no-underline text-sm font-medium leading-normal
                            hover:text-accent" to="/files">
                            View all
                            <Icon name="solar:arrow-right-linear" />
                        </NuxtLink>
                    </div>

                    <div
                        class="files-list flex-1 min-h-0 pt-0 pr-[1.4rem] pb-2 pl-[1.4rem] overflow-y-auto overflow-x-hidden
                        [scrollbar-width:thin] [scrollbar-color:var(--color-scrollbar)_transparent] files-empty:flex files-empty:flex-col"
                        :class="{ 'files-list-empty': files.length === 0 }"
                    >
                        <div
                            v-if="files.length === 0"
                            class="empty-files flex-1 min-h-48 flex flex-col justify-center items-center gap-[0.45rem] text-muted
                            text-center"
                        >
                            <div class="empty-files-icon mb-2 flex items-center justify-center text-3xl leading-[inherit] text-accent
                                size-[3.2rem]">
                                <Icon class="text-[0.825rem] text-muted"
                                    name="solar:file-bold"
                                    size="3rem"
                                />
                            </div>

                            <strong class="text-[0.95rem] font-semibold text-foreground">No files yet</strong>

                            <span class="text-[0.825rem] text-muted"> Your recent files will appear here. </span>

                            <NuxtLink
                                to="/files"
                                class="empty-files-link mt-[0.35rem] flex items-center gap-1 text-accent text-[0.825rem] font-medium
                                no-underline hover:text-accent"
                            >
                                Open Files
                                <Icon class="text-[0.825rem] text-muted" name="solar:arrow-right-linear" />
                            </NuxtLink>
                        </div>
                        <template v-else>
                            <div
                                v-for="file in recentFiles"
                                :key="file.id"
                                class="file-main w-full min-h-[4.6rem] flex items-center justify-between border-t border-t-divider"
                                @click="openFile(file)"
                            >
                                <div class="file-left flex-1 min-w-0 flex items-center gap-[0.85rem]">
                                    <div class="file-icon shrink-0 flex items-center justify-center text-accent bg-accent/12 rounded-md text-xl
                                        leading-[inherit] size-10">
                                        <Icon
                                            :name="getFileIcon(file.mime_type, file.original_name)"
                                        />
                                    </div>

                                    <div class="file-info min-w-0 flex flex-col gap-1">
                                        <input
                                            v-if="editingFileId === file.id"
                                            :ref="
                                                element => {
                                                    nameInput = element as HTMLInputElement | null
                                                }
                                            "
                                            v-model="editingFileName"
                                            type="text"
                                            class="file-name-input w-full min-w-0 py-1 px-2 text-foreground bg-control border border-primary rounded-md
                                            text-sm font-semibold outline-none leading-normal focus-visible:border-accent"
                                            :readonly="isSavingRename"
                                            @keydown.enter.prevent="saveRename(file)"
                                            @keydown.esc.prevent="cancelRename"
                                            @blur="saveRename(file)"
                                            @click.stop
                                        />
                                        <strong class="text-foreground text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap leading-normal" v-else>{{ file.name }}</strong>
                                        <span class="text-muted text-xs font-normal leading-normal"
                                            >{{ getFileType(file.original_name) }} •
                                            {{ formatFileTime(file.created_at) }}</span
                                        >
                                    </div>
                                </div>

                                <div class="file-right shrink-0 flex items-center gap-[0.675rem]">
                                    <span class="file-size min-w-18 text-muted text-[0.85rem] text-right">{{ formatFileSize(file.size) }}</span>

                                    <ItemMenu
                                        type="file"
                                        :is-favorite="isFileFavorite(file.id)"
                                        :can-copy="canCopyFile(file.mime_type, file.original_name)"
                                        @open="openFile(file)"
                                        @download="handleDownload(file.id)"
                                        @rename="startRename(file)"
                                        @copy="handleCopy(file)"
                                        @favorite="handleFavorite(file)"
                                        @delete="handleDelete(file)"
                                        @click.stop
                                    />
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <div class="dashboard-right flex flex-col min-w-0 h-full min-h-0 gap-4">
                <div class="dashboard-card storage-card bg-surface border border-divider rounded-3xl overflow-hidden flex-1
                    min-h-0">
                    <div class="card-header flex items-center justify-between p-4 shrink-0">
                        <h2 class="m-0 text-foreground text-lg font-semibold leading-tight">Storage Usage</h2>
                    </div>

                    <div class="storage-content w-full pt-0 pr-[1.4rem] pb-[1.4rem] pl-[1.4rem]">
                        <div class="storage-top flex items-center justify-between pt-0 pr-[0.8rem] pb-0 pl-[0.2rem] mb-[0.4rem]">
                            <strong class="text-foreground text-[1.275rem]">{{ storagePercent }}%</strong>

                            <span class="text-muted text-[0.85rem]">
                                <b class="text-foreground font-semibold">{{ formatFileSize(user?.storageUsed ?? 0) }}</b> /
                                {{ formatFileSize(user?.storageLimit ?? 0) }}
                            </span>
                        </div>

                        <meter
                            class="storage-meter w-full max-w-full h-4 block appearance-none border-0 rounded-sm bg-meter-track"
                            min="0"
                            max="100"
                            :value="storagePercent"
                        >
                            {{ storagePercent }}%
                        </meter>

                        <div class="storage-types flex flex-col gap-[1.1rem] mt-12">
                            <div class="storage-item flex items-center justify-between w-full text-muted text-[0.85rem]">
                                <div class="storage-name flex items-center gap-[0.55rem]">
                                    <span class="storage-dot blue-dot rounded-full shrink-0 bg-[#5da9ff] size-[0.55rem]"></span>
                                    Images
                                </div>

                                <span>{{ imagesSize }} GB</span>
                            </div>

                            <div class="storage-item flex items-center justify-between w-full text-muted text-[0.85rem]">
                                <div class="storage-name flex items-center gap-[0.55rem]">
                                    <span class="storage-dot purple-dot rounded-full shrink-0 bg-accent size-[0.55rem]"></span>
                                    Documents
                                </div>

                                <span>{{ documentsSize }} GB</span>
                            </div>

                            <div class="storage-item flex items-center justify-between w-full text-muted text-[0.85rem]">
                                <div class="storage-name flex items-center gap-[0.55rem]">
                                    <span class="storage-dot cyan-dot rounded-full shrink-0 bg-[#55c2d4] size-[0.55rem]"></span>
                                    Videos
                                </div>

                                <span>{{ videosSize }} GB</span>
                            </div>

                            <div class="storage-item flex items-center justify-between w-full text-muted text-[0.85rem]">
                                <div class="storage-name flex items-center gap-[0.55rem]">
                                    <span class="storage-dot gray-dot rounded-full shrink-0 bg-[#6b6b75] size-[0.55rem]"></span>
                                    Others
                                </div>

                                <span>{{ othersSize }} GB</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-card quick-card bg-surface border border-divider rounded-3xl overflow-hidden flex-1 min-h-0
                    pb-4">
                    <div class="card-header flex items-center justify-between p-4 shrink-0">
                        <h2 class="m-0 text-foreground text-lg font-semibold leading-tight">Quick Actions</h2>
                    </div>

                    <div class="quick-actions-grid grid grid-cols-2 gap-3 py-0 px-4">
                        <button
                            @click="navigateTo('/files')"
                            type="button"
                            class="quick-action-card min-h-28 flex items-center gap-3 p-4 text-foreground bg-subtle border
                            border-raised rounded-3xl cursor-pointer transition-[background,border-color,transform]
                            duration-200 ease-[ease] hover:bg-raised hover:border-hover-border hover:-translate-y-px"
                        >
                            <div class="quick-action-icon upload-icon flex items-center justify-center shrink-0 rounded-md text-[1.65rem]
                                text-on-primary bg-primary size-[3.4rem]">
                                <Icon name="solar:upload-linear" />
                            </div>

                            <span class="quick-action-title text-foreground text-[0.95rem] font-semibold text-left">Upload File</span>
                        </button>

                        <button
                            @click="navigateTo('/folders')"
                            type="button"
                            class="quick-action-card min-h-28 flex items-center gap-3 p-4 text-foreground bg-subtle border
                            border-raised rounded-3xl cursor-pointer transition-[background,border-color,transform]
                            duration-200 ease-[ease] hover:bg-raised hover:border-hover-border hover:-translate-y-px"
                        >
                            <div class="quick-action-icon folder-icon flex items-center justify-center shrink-0 rounded-md text-[1.65rem]
                                text-accent bg-accent/12 border border-accent/25 size-[3.4rem]">
                                <Icon name="solar:add-linear" />
                            </div>

                            <span class="quick-action-title text-foreground text-[0.95rem] font-semibold text-left">New Folder</span>
                        </button>

                        <button
                            type="button"
                            class="quick-action-card min-h-28 flex items-center gap-3 p-4 text-foreground bg-subtle border
                            border-raised rounded-3xl cursor-pointer transition-[background,border-color,transform]
                            duration-200 ease-[ease] hover:bg-raised hover:border-hover-border hover:-translate-y-px"
                        >
                            <div class="quick-action-icon note-icon flex items-center justify-center shrink-0 rounded-md text-[1.65rem]
                                text-accent bg-accent/12 border border-accent/25 size-[3.4rem]">
                                <Icon name="solar:notebook-linear" />
                            </div>

                            <span class="quick-action-title text-foreground text-[0.95rem] font-semibold text-left">New Note</span>
                        </button>

                        <button
                            type="button"
                            class="quick-action-card min-h-28 flex items-center gap-3 p-4 text-foreground bg-subtle border
                            border-raised rounded-3xl cursor-pointer transition-[background,border-color,transform]
                            duration-200 ease-[ease] hover:bg-raised hover:border-hover-border hover:-translate-y-px"
                        >
                            <div class="quick-action-icon inbox-icon flex items-center justify-center shrink-0 rounded-md text-[1.65rem]
                                text-on-primary bg-primary border border-primary size-[3.4rem]">
                                <Icon
                                    name="solar:users-group-rounded-linear"
                                    class=""
                                />
                            </div>

                            <span class="quick-action-title text-foreground text-[0.95rem] font-semibold text-left">Shared Inbox</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

import { canCopyFile, getFileIcon, getFileType, formatFileSize, formatFileTime } from '~/utils/file'

const { openToast } = useToast()

const { user, files, folders, notes, favorites, error, fetchAll } = useUser()
const { deleteFile, renameFile, copyFile, downloadFile, isDeleting } = useFileActions()
const { addFavorite, removeFavorite } = useFavoriteActions()

await fetchAll()

if (error.value) {
    openToast(error.value, 'error')
}

const recentFiles = computed(() => files.value.slice(0, 12))

type FileItem = (typeof files.value)[number]

const editingFileId = ref<string | null>(null)
const editingFileName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const isSavingRename = ref(false)
const isCopying = ref(false)
const isSavingFavorite = ref(false)

const openFile = (file: FileItem) => navigateTo(`/files/${file.id}`)

const startRename = async (file: FileItem) => {
    if (isSavingRename.value) return

    editingFileId.value = file.id
    editingFileName.value = file.name

    await nextTick()
    nameInput.value?.focus()
    nameInput.value?.select()
}

const cancelRename = () => {
    if (isSavingRename.value) return

    editingFileId.value = null
}

const saveRename = async (file: FileItem) => {
    if (editingFileId.value !== file.id || isSavingRename.value) return

    const newName = editingFileName.value.trim()

    if (!newName || newName === file.name) {
        cancelRename()

        return
    }

    isSavingRename.value = true

    try {
        await renameFile(file.id, newName)
        file.name = newName
        editingFileId.value = null
        await fetchAll()
        openToast(error.value || 'File renamed successfully.', error.value ? 'error' : 'success')
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be renamed.', 'error')
    } finally {
        isSavingRename.value = false
    }
}

const handleCopy = async (file: FileItem) => {
    if (isCopying.value || !canCopyFile(file.mime_type, file.original_name)) return

    isCopying.value = true

    try {
        await copyFile(file)
        openToast('Copied to clipboard.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be copied to the clipboard.',
            'error'
        )
    } finally {
        isCopying.value = false
    }
}

const handleDownload = async (fileId: string) => {
    try {
        await downloadFile(fileId)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be downloaded.', 'error')
    }
}

const handleDelete = async (file: FileItem) => {
    if (isDeleting.value) return

    try {
        await deleteFile(file.id)
        files.value = files.value.filter(item => item.id !== file.id)
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be deleted.', 'error')
    }
}

const isFileFavorite = (fileId: string) => favorites.value.some(item => item.file_id === fileId)

const handleFavorite = async (file: FileItem) => {
    if (isSavingFavorite.value) return

    isSavingFavorite.value = true
    const wasFavorite = isFileFavorite(file.id)

    try {
        if (wasFavorite) {
            await removeFavorite(file.id, 'file')
        } else {
            await addFavorite(file.id, 'file')
        }

        await fetchAll()
        openToast(
            error.value ||
                (wasFavorite ? 'File removed from favorites.' : 'File favorited successfully.'),
            error.value ? 'error' : 'success'
        )
    } catch (err: any) {
        openToast(err.data?.message || err.message || 'File could not be favorited.', 'error')
    } finally {
        isSavingFavorite.value = false
    }
}

const storagePercent = computed(() => {
    const used = Number(user.value?.storageUsed ?? 0)
    const limit = Number(user.value?.storageLimit ?? 0)

    if (limit === 0) return 0

    return ((used / limit) * 100).toFixed(2)
})

const imagesSize = ref(0)
const documentsSize = ref(0)
const videosSize = ref(0)
const othersSize = ref(0)
</script>

<style scoped>
@media (max-width: 600px) {
    .stats-grid {
        gap: 0.875rem;
    }

    .stats-grid .stat-card {
        position: relative;
        align-items: stretch;
        min-height: 10rem;
        padding: 1.5rem;
        gap: 0;
        border-radius: 1.75rem;
    }

    .stats-grid .stat-icon {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        width: 1.25rem;
        height: 1.25rem;
        font-size: 1.25rem;
        color: var(--color-muted);
        background: transparent;
        border-radius: 0;
    }

    .stats-grid .stat-info {
        gap: 0.5rem;
        padding-right: 2rem;
        text-align: left;
    }

    .stats-grid .stat-info span {
        order: -1;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    .stats-grid .stat-info strong {
        font-size: 1.875rem;
        line-height: 1.2;
    }

    .stats-grid .stat-description {
        display: block;
        margin: auto 0 0;
        padding-top: 1.5rem;
        color: var(--color-muted);
        font-size: 0.875rem;
        line-height: 1.5;
    }
}

.files-list::-webkit-scrollbar-track {
    background: transparent;
}

.files-list::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar);
    border-radius: 4px;
}

.files-list::-webkit-scrollbar-thumb:hover {
    background: var(--color-hover-border);
}

.storage-meter::-webkit-meter-bar {
    background: var(--color-meter-track);
    border: none;
    border-radius: 4px;

    box-shadow: none;
}

.storage-meter::-webkit-meter-optimum-value,
.storage-meter::-webkit-meter-suboptimum-value,
.storage-meter::-webkit-meter-even-less-good-value {
    background: var(--color-accent);
    border-radius: 4px;
}

.storage-meter::-moz-meter-bar {
    background: var(--color-accent);
    border-radius: 4px;
}
</style>
