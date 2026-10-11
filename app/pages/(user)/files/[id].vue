
<script setup lang="ts">
import {
    canCopyFile,
    getFileIcon,
    getFileType,
    formatFileSize,
    formatFileTime
} from "~/utils/file"
import { getFileReturnPage } from '~/utils/fileNavigation'

definePageMeta({
    middleware: ['auth', 'file-origin'],
    layout: 'user'
})

const route = useRoute()
const router = useRouter()
const fileId = route.params.id as string

const returnPage = computed(() => {
    return getFileReturnPage(route.query.from) ?? { path: '/files', name: 'Files' }
})

interface FileData {
    id: string
    user_id: string
    folder_id: string | null
    name: string
    original_name: string
    mime_type: string | null
    size: number
    storage_key: string
    created_at: string | null
    updated_at: string | null
}

const { data: file } = await useFetch<FileData>(
    `/api/files/${fileId}`
)

const { deleteFile, renameFile, downloadFile, copyFile } = useFileActions()
const { addFavorite, removeFavorite } = useFavoriteActions()
const { favorites, fetchAll } = useUser()
const { openToast } = useToast()

const isRenaming = ref(false)
const editingFileName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const previewNameInput = ref<HTMLInputElement | null>(null)
const isSavingRename = ref(false)
const isCopying = ref(false)
const canCopy = computed(() => canCopyFile(file.value?.mime_type, file.value?.original_name))

const goBack = () => {
    router.push(returnPage.value.path)
}

const startRename = async () => {
    if (!file.value) return

    if (!isRenaming.value) {
        editingFileName.value = file.value.name
        isRenaming.value = true
    }

    await nextTick()

    const input = nameInput.value ?? previewNameInput.value
    input?.focus()
    input?.select()
}

const handleRenameBlur = (event: FocusEvent) => {
    if (!isRenaming.value) return

    const nextElement = event.relatedTarget as HTMLElement | null

    if (nextElement?.closest('.actions-btn.rename')) {
        return
    }

    saveRename()
}

const cancelRename = () => {
    isRenaming.value = false
    editingFileName.value = file.value?.name ?? ''
}

const saveRename = async () => {
    if (!file.value || !isRenaming.value || isSavingRename.value) return

    const newName = editingFileName.value.trim()

    if (!newName || newName === file.value.name) {
        cancelRename()
        return
    }

    isSavingRename.value = true

    try {
        await renameFile(file.value.id, newName)

        file.value.name = newName
        isRenaming.value = false

        openToast('File renamed successfully.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be renamed.',
            'error'
        )
    } finally {
        isSavingRename.value = false
    }
}

watch(
    () => file.value?.name,
    (name) => {
        if (!isRenaming.value) {
            editingFileName.value = name ?? ''
        }
    },
    { immediate: true }
)

const handleDownload = async (id: string) => {
    try {
        await downloadFile(id)
        openToast('Download started.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be downloaded.',
            'error'
        )
    }
}

const handleCopy = async () => {
    if (!file.value || !canCopy.value || isCopying.value) return

    isCopying.value = true

    try {
        await copyFile(file.value)
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

const handleDelete = async (id: string) => {
    try {
        await deleteFile(id)

        openToast('File deleted successfully.', 'success')

        await router.push(returnPage.value.path)
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be deleted.',
            'error'
        )
    }
}

const isFileFavorite = (id: string) => {
    return favorites.value.some(favorite => {
        return favorite.file_id === id
    })
}

const handleFavorite = async (item: FileData) => {
    try {
        if (isFileFavorite(item.id)) {
            await removeFavorite(item.id, 'file')
            await fetchAll()

            openToast('File removed from favorites.', 'success')
            return
        }

        await addFavorite(item.id, 'file')
        await fetchAll()

        openToast('File favorited successfully.', 'success')
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'File could not be favorited.',
            'error'
        )
    }
}

const isImage = computed(() => {
    return file.value?.mime_type?.startsWith('image/') ?? false
})

const isText = computed(() => {
    return file.value?.mime_type?.startsWith('text/') ?? false
})

const isVideo = computed(() => {
    return file.value?.mime_type?.startsWith('video/') ?? false
})

const isPdf = computed(() => {
    return file.value?.mime_type === 'application/pdf'
})

const isPreviewable = computed(() => {
    return isImage.value || isText.value || isVideo.value || isPdf.value
})

const fileExtension = computed(() => {
    return file.value?.original_name?.split('.').pop()?.toUpperCase() || 'FILE'
})

const textContent = ref('')

if (isText.value) {
    textContent.value = await $fetch<string>(
        `/api/files/preview?fileId=${fileId}`
    )
}

const imageDimensions = ref<{
    width: number
    height: number
} | null>(null)

const getImageDimensions = (src: string) => {
    return new Promise<{ width: number, height: number }>((resolve, reject) => {
        const image = new Image()

        image.onload = () => {
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight
            })
        }

        image.onerror = reject
        image.src = src
    })
}

onMounted(async () => {
    if (!isImage.value || !file.value) return

    try {
        imageDimensions.value = await getImageDimensions(
            `/api/files/preview?fileId=${file.value.id}`
        )
    } catch {
        imageDimensions.value = null
    }
})
</script>

<template>
    <div class="file-page">
        <div
            v-if="file && !isPreviewable"
            class="file-details"
        >
            <div class="file-breadcrumb">
                <button
                    class="breadcrumb-back"
                    @click="goBack"
                >
                    <Icon name="solar:arrow-left-linear" size="1.2rem" />
                    <span>{{ returnPage.name }}</span>
                </button>

                <span class="separator">/</span>

                <span class="file-name">
                    {{ file.name }}
                </span>
            </div>

            <div class="file-details-body">
                <div class="file-details-icon">
                    <Icon
                        :name="getFileIcon(file.original_name)"
                        size="3.75rem"
                    />
                </div>

                <div class="file-details-content">
                    <div class="file-details-title">
                        <input
                            ref="nameInput"
                            v-model="editingFileName"
                            type="text"
                            class="name-input"
                            :class="{ active: isRenaming }"
                            :readonly="!isRenaming"
                            @keyup.enter="saveRename"
                            @keyup.esc="cancelRename"
                            @blur="handleRenameBlur"
                        >

                        <span>
                            {{ file.mime_type || 'Unknown file type' }}
                        </span>
                    </div>

                    <div class="file-stats">
                        <div class="file-stat-card">
                            <div class="file-stat-icon">
                                <Icon name="solar:file-text-bold" size="1.45rem" />
                            </div>

                            <div class="file-stat-content">
                                <span class="stat-label">Type</span>
                                <span class="stat-value">
                                    {{ fileExtension }}
                                </span>
                            </div>
                        </div>

                        <div class="file-stat-card">
                            <div class="file-stat-icon">
                                <Icon name="solar:database-bold" size="1.45rem" />
                            </div>

                            <div class="file-stat-content">
                                <span class="stat-label">Size</span>
                                <span class="stat-value">
                                    {{ formatFileSize(file.size) }}
                                </span>
                            </div>
                        </div>

                        <div class="file-stat-card">
                            <div class="file-stat-icon">
                                <Icon name="solar:calendar-add-bold" size="1.45rem" />
                            </div>

                            <div class="file-stat-content">
                                <span class="stat-label">Created</span>
                                <span class="stat-value">
                                    {{ formatFileTime(file.created_at ?? '') }}
                                </span>
                            </div>
                        </div>

                        <div class="file-stat-card">
                            <div class="file-stat-icon">
                                <Icon name="solar:clock-circle-bold" size="1.45rem" />
                            </div>

                            <div class="file-stat-content">
                                <span class="stat-label">Modified</span>
                                <span class="stat-value">
                                    {{ formatFileTime(file.updated_at ?? '') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="file-details-actions">
                <DetailsPanel
                    :item-id="fileId"
                    item-type="file"
                    :actions="['download', 'rename', 'copy', 'favorite', 'delete']"
                    :is-favorite="isFileFavorite(fileId)"
                    :is-copying="isCopying"
                    :can-copy="canCopy"
                    :show-info="false"
                    @download="handleDownload(fileId)"
                    @rename="startRename"
                    @copy="handleCopy"
                    @favorite="handleFavorite(file)"
                    @delete="handleDelete(fileId)"
                />
            </div>
        </div>

        <template v-else-if="file">
            <div class="preview-navigation">
                <button
                    class="preview-back-btn"
                    @click="goBack"
                >
                    <Icon name="solar:arrow-left-linear" size="1.2rem" />
                    <span>Back to {{ returnPage.name }}</span>
                </button>

                <span class="separator">/</span>

                <span class="file-name">
                    {{ file.name }}
                </span>
            </div>

            <DetailsView class="file-preview" :previewable="isPreviewable">
                <template #preview>
                    <div class="preview-card">
                        <div class="preview-header">
                            <input
                                v-if="isRenaming"
                                ref="previewNameInput"
                                v-model="editingFileName"
                                type="text"
                                class="name-input active"
                                @keyup.enter="saveRename"
                                @keyup.esc="cancelRename"
                                @blur="handleRenameBlur"
                            >

                            <span v-else>{{ file.name }}</span>
                        </div>

                        <div class="preview-content" :class="{ 'text-preview': isText }">
                            <img
                                v-if="isImage"
                                :src="`/api/files/preview?fileId=${file.id}`"
                                :alt="file.name"
                            >

                            <pre v-else-if="isText">{{ textContent }}</pre>

                            <iframe
                                v-else-if="isPdf"
                                :src="`/api/files/preview?fileId=${fileId}`"
                            />

                            <video
                                v-else-if="isVideo"
                                :src="`/api/files/preview?fileId=${fileId}`"
                                controls
                                preload="metadata"
                            />
                        </div>
                    </div>
                </template>

                <template #details>
                    <DetailsPanel
                        :item-id="fileId"
                        item-type="file"
                        :actions="['download', 'favorite', 'rename', 'copy', 'delete']"
                        :is-favorite="isFileFavorite(fileId)"
                        :is-copying="isCopying"
                        :can-copy="canCopy"
                        :show-info="true"
                        @download="handleDownload(fileId)"
                        @favorite="handleFavorite(file)"
                        @rename="startRename"
                        @copy="handleCopy"
                        @delete="handleDelete(fileId)"
                    >
                        <template #info>
                            <div class="info-row">
                                <span class="info-label">Name</span>
                                <span class="info-value">{{ file.name }}</span>
                            </div>

                            <div class="info-row">
                                <span class="info-label">Type</span>
                                <span class="info-value">
                                    {{ getFileType(file.original_name) }}
                                </span>
                            </div>

                            <div class="info-row">
                                <span class="info-label">Size</span>
                                <span class="info-value">
                                    {{ formatFileSize(file.size) }}
                                </span>
                            </div>

                            <div class="info-row">
                                <span class="info-label">Created</span>
                                <span class="info-value">
                                    {{ formatFileTime(file.created_at ?? '') }}
                                </span>
                            </div>

                            <div class="info-row">
                                <span class="info-label">Modified</span>
                                <span class="info-value">
                                    {{ formatFileTime(file.updated_at ?? '') }}
                                </span>
                            </div>

                            <div v-if="isImage" class="info-row">
                                <span class="info-label">Dimensions</span>
                                <span class="info-value">
                                    <template v-if="imageDimensions">
                                        {{ imageDimensions.width }} × {{ imageDimensions.height }}
                                    </template>
                                    <template v-else>
                                        -
                                    </template>
                                </span>
                            </div>
                        </template>
                    </DetailsPanel>
                </template>
            </DetailsView>
        </template>
    </div>
</template>

<style scoped>
.file-page {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.file-preview {
    flex: 1;
    min-height: 0;
}

.file-details {
    width: 100%;
    padding: 1.25rem 1.5rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;
    box-sizing: border-box;
    overflow: hidden;
}

.file-breadcrumb,
.preview-navigation {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
}

.file-breadcrumb {
    margin-bottom: 2rem;
}

.preview-navigation {
    width: 100%;
    flex-shrink: 0;
    margin-bottom: 1rem;
    padding: 0.9rem 1.2rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 0.75rem;
    box-sizing: border-box;
}

.breadcrumb-back,
.preview-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    border: none;
    color: #8b7cff;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s ease;
}

.breadcrumb-back:hover,
.preview-back-btn:hover {
    color: #b5acff;
}

.separator {
    color: #6f6f78;
    margin-left: 0.6rem;
    flex-shrink: 0;
}

.file-name {
    min-width: 0;
    color: #c5c5cb;
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-details-body {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2rem;
    padding: 0.3rem 0 1.25rem;
    border-bottom: 1px solid #29292e;
}

.file-details-icon {
    width: 7rem;
    height: 7rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #282354;
    border-radius: 1.25rem;
    color: #8b7cff;
}

.file-details-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
}

.file-details-title {
    min-width: 0;
}

.file-details-title > span {
    color: #898991;
    font-size: 0.85rem;
}

.file-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
}

.file-stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 9rem;
    padding: 0.7rem 0.9rem;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 0.65rem;
    box-sizing: border-box;
}

.file-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #8b7cff;
}

.file-stat-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-label {
    color: #898991;
    font-size: 0.75rem;
}

.stat-value {
    color: #f0f0f2;
    font-size: 0.85rem;
    font-weight: 500;
    overflow-wrap: anywhere;
}

.file-details-actions {
    width: 100%;
    padding-top: 1rem;
}

.file-details-actions :deep(.details-actions) {
    display: flex;
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 0.75rem;
    padding: 0.5rem 0;
    background: transparent;
    border: none;
}

.file-details-actions :deep(.actions-btn) {
    flex: 0 0 auto;
    width: auto;
    min-width: 9rem;
    height: 2.8rem;
    padding: 0 1.2rem;
}

.preview-card {
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 0.75rem;
    overflow: hidden;
}

.preview-header {
    flex-shrink: 0;
    padding: 1rem 1.2rem;
    color: #fff;
    border-bottom: 1px solid #29292e;
    font-size: 0.95rem;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.preview-header .name-input {
    font-size: 0.95rem;
}

.preview-content {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    overflow: auto;
}

.preview-content img {
    max-width: 100%;
    max-height: 32rem;
    object-fit: contain;
    border-radius: 0.6rem;
}

.preview-content pre {
    width: 100%;
    margin: 0;
    color: #d5d5da;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: monospace;
    font-size: 0.85rem;
}

.preview-content.text-preview {
    display: block;
    overscroll-behavior: contain;
}

.preview-content iframe {
    width: 100%;
    height: 32rem;
    border: none;
    border-radius: 0.6rem;
}

.preview-content video {
    width: 100%;
    max-height: 32rem;
    object-fit: contain;
    border-radius: 0.6rem;
    background: #000;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    flex-shrink: 0;
    color: #898991;
    font-size: 0.8rem;
}

.info-value {
    min-width: 0;
    max-width: 65%;
    color: #d5d5da;
    font-size: 0.8rem;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.name-input {
    display: block;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.4rem 0.3rem;
    margin: 0 0 0.35rem;
    background: transparent;
    color: #fff;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    font-family: inherit;
    font-size: 1.2rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
    outline: none;
}

.name-input:not(.active) {
    cursor: default;
}

.name-input.active {
    border-color: #3c47be;
    background: #202024;
    cursor: text;
}

.name-input.active:focus {
    border-color: #5965ed;
}

@media (max-width: 900px) {
    .file-page {
        height: auto;
        min-height: 100%;
    }

    .file-preview {
        flex: none;
    }

    .preview-card {
        height: 36rem;
    }
}

@media (max-width: 800px) {
    .file-details-body {
        align-items: flex-start;
        gap: 1rem;
    }

    .file-details-icon {
        width: 4.5rem;
        height: 4.5rem;
    }

    .file-stat-card {
        flex: 1 1 10rem;
    }
}

@media (max-width: 500px) {
    .file-details {
        padding: 1rem;
    }

    .file-details-body {
        flex-direction: column;
    }

    .file-details-content {
        width: 100%;
    }

    .file-details-actions :deep(.actions-btn) {
        min-width: 0;
    }

    .preview-navigation {
        padding: 0.8rem;
    }
}
</style>
