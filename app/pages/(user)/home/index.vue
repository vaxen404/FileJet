<template>
    <div class="dashboard-page">
        <section class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon purple-bg">
                    <Icon
                        name="solar:document-linear"
                        class="purple"
                    />
                </div>

                <div class="stat-info">
                    <strong>{{ files.length }}</strong>
                    <span>Files</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon blue-bg">
                    <Icon
                        name="solar:folder-linear"
                        class="blue"
                    />
                </div>

                <div class="stat-info">
                    <strong>{{ folders.length }}</strong>
                    <span>Folders</span>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon green-bg">
                    <Icon
                        name="solar:notebook-linear"
                        class="green"
                    />
                </div>

                <div class="stat-info">
                    <strong>{{ notes.length }}</strong>
                    <span>Notes</span>
                </div>
            </div>
        </section>

        <section class="dashboard-grid">
            <div class="dashboard-left">
                <div class="dashboard-card">
                    <div class="card-header">
                        <h2>Recent Files</h2>

                        <NuxtLink to="/files">
                            View all
                            <Icon name="solar:arrow-right-linear" />
                        </NuxtLink>
                    </div>

                    <div
                        class="files-list"
                        :class="{ 'files-list-empty': files.length === 0 }"
                    >
                        <div
                            v-if="files.length === 0"
                            class="empty-files"
                        >
                            <div class="empty-files-icon">
                                <Icon
                                    name="solar:file-bold"
                                    size="3rem"
                                />
                            </div>

                            <strong>No files yet</strong>

                            <span> Your recent files will appear here. </span>

                            <NuxtLink
                                to="/files"
                                class="empty-files-link"
                            >
                                Open Files
                                <Icon name="solar:arrow-right-linear" />
                            </NuxtLink>
                        </div>
                        <template v-else>
                            <div
                                v-for="file in recentFiles"
                                :key="file.id"
                                class="file-main"
                                @click="openFile(file)"
                            >
                                <div class="file-left">
                                    <div class="file-icon">
                                        <Icon
                                            :name="getFileIcon(file.mime_type, file.original_name)"
                                        />
                                    </div>

                                    <div class="file-info">
                                        <input
                                            v-if="editingFileId === file.id"
                                            :ref="
                                                element => {
                                                    nameInput = element as HTMLInputElement | null
                                                }
                                            "
                                            v-model="editingFileName"
                                            type="text"
                                            class="file-name-input"
                                            :readonly="isSavingRename"
                                            @keydown.enter.prevent="saveRename(file)"
                                            @keydown.esc.prevent="cancelRename"
                                            @blur="saveRename(file)"
                                            @click.stop
                                        />
                                        <strong v-else>{{ file.name }}</strong>
                                        <span
                                            >{{ getFileType(file.original_name) }} •
                                            {{ formatFileTime(file.created_at) }}</span
                                        >
                                    </div>
                                </div>

                                <div class="file-right">
                                    <span class="file-size">{{ formatFileSize(file.size) }}</span>

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

            <div class="dashboard-right">
                <div class="dashboard-card storage-card">
                    <div class="card-header">
                        <h2>Storage Usage</h2>
                    </div>

                    <div class="storage-content">
                        <div class="storage-top">
                            <strong>{{ storagePercent }}%</strong>

                            <span>
                                <b>{{ formatFileSize(user?.storageUsed ?? 0) }}</b> /
                                {{ formatFileSize(user?.storageLimit ?? 0) }}
                            </span>
                        </div>

                        <meter
                            class="storage-meter"
                            min="0"
                            max="100"
                            :value="storagePercent"
                        >
                            {{ storagePercent }}%
                        </meter>

                        <div class="storage-types">
                            <div class="storage-item">
                                <div class="storage-name">
                                    <span class="storage-dot blue-dot"></span>
                                    Images
                                </div>

                                <span>{{ imagesSize }} GB</span>
                            </div>

                            <div class="storage-item">
                                <div class="storage-name">
                                    <span class="storage-dot purple-dot"></span>
                                    Documents
                                </div>

                                <span>{{ documentsSize }} GB</span>
                            </div>

                            <div class="storage-item">
                                <div class="storage-name">
                                    <span class="storage-dot cyan-dot"></span>
                                    Videos
                                </div>

                                <span>{{ videosSize }} GB</span>
                            </div>

                            <div class="storage-item">
                                <div class="storage-name">
                                    <span class="storage-dot gray-dot"></span>
                                    Others
                                </div>

                                <span>{{ othersSize }} GB</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-card quick-card">
                    <div class="card-header">
                        <h2>Quick Actions</h2>
                    </div>

                    <div class="quick-actions-grid">
                        <button
                            @click="navigateTo('/files')"
                            type="button"
                            class="quick-action-card"
                        >
                            <div class="quick-action-icon upload-icon">
                                <Icon name="solar:upload-linear" />
                            </div>

                            <span class="quick-action-title">Upload File</span>
                        </button>

                        <button
                            @click="navigateTo('/folders')"
                            type="button"
                            class="quick-action-card"
                        >
                            <div class="quick-action-icon folder-icon">
                                <Icon name="solar:add-linear" />
                            </div>

                            <span class="quick-action-title">New Folder</span>
                        </button>

                        <button
                            type="button"
                            class="quick-action-card"
                        >
                            <div class="quick-action-icon note-icon">
                                <Icon name="solar:notebook-linear" />
                            </div>

                            <span class="quick-action-title">New Note</span>
                        </button>

                        <button
                            type="button"
                            class="quick-action-card"
                        >
                            <div class="quick-action-icon inbox-icon">
                                <Icon
                                    name="solar:users-group-rounded-linear"
                                    class=""
                                />
                            </div>

                            <span class="quick-action-title">Shared Inbox</span>
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
.dashboard-page {
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    box-sizing: border-box;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;

    flex-shrink: 0;
}

.stat-card {
    min-height: 8rem;

    display: flex;
    align-items: center;
    gap: 1rem;

    padding: 1rem;

    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;

    box-sizing: border-box;
}

.stat-icon {
    width: 3.4rem;
    height: 3.4rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #7777ff;
    background: #24244d;

    border-radius: 0.675rem;

    font-size: 1.6rem;
}

.stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.stat-info strong {
    color: #ffffff;

    font-size: 1.7rem;
    font-weight: 700;
}

.stat-info span {
    color: #92929a;
    font-size: 0.9rem;
}

.purple {
    color: #8b7cff;
}

.blue {
    color: #5da9ff;
}

.green {
    color: #55db8c;
}

.purple-bg {
    background: #29215c;
}

.blue-bg {
    background: #152c49;
}

.green-bg {
    background: #153a29;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.15fr);
    gap: 0.75rem;

    flex: 1;
    min-height: 0;
}

.dashboard-left,
.dashboard-right {
    display: flex;
    flex-direction: column;

    min-width: 0;
}

.dashboard-left {
    height: 100%;
    min-height: 0;
}

.dashboard-left .dashboard-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.dashboard-card {
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;

    box-sizing: border-box;
    overflow: hidden;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 1rem;

    flex-shrink: 0;
}

.card-header h2 {
    margin: 0;

    color: #ffffff;

    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.25;
}

.card-header a {
    display: flex;
    align-items: center;
    gap: 0.3rem;

    color: #7777ff;

    text-decoration: none;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    line-height: 1.5;
}

.card-header a:hover {
    color: #9999ff;
}

.files-list {
    flex: 1;
    min-height: 0;

    padding: 0 1.4rem 0.5rem;

    overflow-y: auto;
    overflow-x: hidden;

    scrollbar-width: thin;
    scrollbar-color: #39393f transparent;
}

.files-list::-webkit-scrollbar-track {
    background: transparent;
}

.files-list::-webkit-scrollbar-thumb {
    background: #39393f;
    border-radius: 4px;
}

.files-list::-webkit-scrollbar-thumb:hover {
    background: #4a4a52;
}

.file-main {
    width: 100%;
    min-height: 4.6rem;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-top: 1px solid #29292e;
}

.file-left {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.85rem;
}

.file-icon {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #8b7cff;
    background: #29215c;

    border-radius: 6px;

    font-size: 1.25rem;
}

.file-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.file-info strong {
    color: #ffffff;

    font-size: 0.875rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
}

.file-info span {
    color: #898991;

    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.5;
}

.file-name-input {
    width: 100%;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    box-sizing: border-box;
    color: #ffffff;
    background: #202024;
    border: 1px solid #3c47be;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    outline: none;
    line-height: 1.5;
}

.file-name-input:focus-visible {
    border-color: #5965ed;
}

.file-right {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.675rem;
}

.file-size {
    min-width: 4.5rem;
    color: #b0b0b8;
    font-size: 0.85rem;
    text-align: right;
}

.dashboard-right {
    height: 100%;
    min-height: 0;

    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.storage-content {
    width: 100%;
    padding: 0 1.4rem 1.4rem;
    box-sizing: border-box;
}

.storage-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 0.8rem 0 0.2rem;

    margin-bottom: 0.4rem;
}

.storage-top strong {
    color: #ffffff;
    font-size: 1.275rem;
}

.storage-top span {
    color: #8d8d95;
    font-size: 0.85rem;
}

.storage-top b {
    color: #ffffff;
    font-weight: 600;
}

.storage-meter {
    width: 100%;
    max-width: 100%;
    height: 1rem;

    display: block;
    box-sizing: border-box;

    appearance: none;
    -webkit-appearance: none;

    border: none;
    border-radius: 4px;
    background: #2c2c31;
}

.storage-meter::-webkit-meter-bar {
    background: #29292e;
    border: none;
    border-radius: 4px;

    box-shadow: none;
}

.storage-meter::-webkit-meter-optimum-value {
    background: #4242fc;
    border-radius: 4px;
}

.storage-meter::-moz-meter-bar {
    background: #4242fc;
    border-radius: 4px;
}

.storage-types {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;

    margin-top: 3rem;
}

.storage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;

    color: #92929a;
    font-size: 0.85rem;
}

.storage-name {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}

.storage-dot {
    width: 0.55rem;
    height: 0.55rem;

    border-radius: 50%;
    flex-shrink: 0;
}

.blue-dot {
    background: #5da9ff;
}

.purple-dot {
    background: #8b7cff;
}

.cyan-dot {
    background: #55c2d4;
}

.gray-dot {
    background: #6b6b75;
}

.storage-card,
.quick-card {
    flex: 1;
    min-height: 0;
}

.quick-card {
    padding-bottom: 1rem;
}

.quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;

    padding: 0 1rem;
}

.quick-action-card {
    min-height: 7rem;

    display: flex;
    align-items: center;
    gap: 0.75rem;

    padding: 1rem;

    color: #ffffff;
    background: #1d1d21;

    border: 1px solid #2d2d33;
    border-radius: 24px;

    cursor: pointer;

    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        transform 0.2s ease;
}

.quick-action-card:hover {
    background: #232328;
    border-color: #383840;

    transform: translateY(-1px);
}

.quick-action-icon {
    width: 3.4rem;
    height: 3.4rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 6px;

    font-size: 1.65rem;
}

.quick-action-title {
    color: #ffffff;

    font-size: 0.95rem;
    font-weight: 600;

    text-align: left;
}

.upload-icon {
    color: #ffffff;
    background: #356de8;
}

.folder-icon {
    color: #5da9ff;
    background: #173655;

    border: 1px solid #234c70;
}

.note-icon {
    color: #55db8c;
    background: #16452d;

    border: 1px solid #1d5d3a;
}

.inbox-icon {
    color: #ffffff;
    background: #5c2ca7;

    border: 1px solid #7138c2;
}

.files-list-empty {
    display: flex;
    flex-direction: column;
}

.empty-files {
    flex: 1;
    min-height: 12rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.45rem;
    color: #898991;
    text-align: center;
}

.empty-files-icon {
    width: 3.2rem;
    height: 3.2rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: #6f74ff;
}

.empty-files strong {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f5f5f5;
}

.empty-files span {
    font-size: 0.825rem;
    color: #898991;
}

.empty-files-link {
    margin-top: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #767cff;
    font-size: 0.825rem;
    font-weight: 500;
    text-decoration: none;
}

.empty-files-link:hover {
    color: #9297ff;
}
</style>
