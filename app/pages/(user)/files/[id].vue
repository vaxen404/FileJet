<template>
    <div
        v-if="file"
        class="file-page"
    >
        <section
            class="file-workspace"
            aria-label="File preview"
        >
            <div class="preview-card">
                <div
                    class="preview-content"
                    :class="{ 'text-preview': isText && !previewError }"
                >
                    <div
                        v-if="previewError"
                        class="preview-message"
                        role="status"
                    >
                        <Icon
                            name="solar:document-linear"
                            size="3rem"
                        />
                        <p>{{ previewError }}</p>
                        <span>Use the Download button to download this file.</span>
                    </div>
                    <img
                        v-else-if="isImage"
                        ref="imagePreview"
                        :src="previewUrl"
                        :alt="displayFileName"
                        @load="captureImageMetadata"
                        @error="handlePreviewError"
                    />
                    <pre v-else-if="isText">{{ textContent }}</pre>
                    <iframe
                        v-else-if="isPdf"
                        :src="previewUrl"
                        title="PDF preview"
                    />
                    <video
                        v-else-if="isVideo"
                        ref="videoPreview"
                        :src="previewUrl"
                        controls
                        :muted="false"
                        playsinline
                        preload="metadata"
                        @loadedmetadata="captureVideoMetadata"
                        @error="handlePreviewError"
                    />
                    <div
                        v-else
                        class="preview-message"
                    >
                        <Icon
                            :name="getFileIcon(file.mime_type, file.original_name)"
                            size="3.75rem"
                        />
                        <p>Preview is not available for this file type.</p>
                        <span>Use the Download button to download this file.</span>
                    </div>
                </div>
            </div>
        </section>

        <aside
            class="file-panel"
            aria-label="File details"
        >
            <section
                class="file-information"
                aria-labelledby="file-detail-title"
            >
                <div class="file-heading">
                    <div class="file-heading-text">
                        <h1 id="file-detail-title">{{ displayFileName }}</h1>
                        <p class="file-summary">
                            <span>{{ formatFileSize(file.size) }}</span>
                            <template v-if="file.created_at">
                                <span aria-hidden="true">·</span>
                                <span>{{ formatDateTime(file.created_at) }}</span>
                            </template>
                        </p>
                    </div>
                    <button
                        type="button"
                        class="close-details"
                        :aria-label="`Back to ${returnPage.name}`"
                        :title="`Back to ${returnPage.name}`"
                        @click="goBack"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="m6 6 12 12M18 6 6 18"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div
                    class="file-actions"
                    role="group"
                    aria-label="File actions"
                >
                    <button
                        type="button"
                        class="action-button download-button"
                        :disabled="isDownloading || isDeleting || isSavingRename"
                        :aria-busy="isDownloading"
                        @click="handleDownload(file.id)"
                    >
                        <Icon
                            name="solar:download-linear"
                            size="1.25rem"
                        />
                        {{ isDownloading ? 'Downloading...' : 'Download' }}
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action"
                        :disabled="isUpdatingFavorite || isDeleting || isSavingRename"
                        :aria-label="
                            isFileFavorite(file.id) ? 'Remove from favorites' : 'Add to favorites'
                        "
                        :title="
                            isFileFavorite(file.id) ? 'Remove from favorites' : 'Add to favorites'
                        "
                        :aria-pressed="isFileFavorite(file.id)"
                        :aria-busy="isUpdatingFavorite"
                        @click="handleFavorite(file)"
                    >
                        <Icon
                            :name="
                                isFileFavorite(file.id) ? 'solar:star-bold' : 'solar:star-linear'
                            "
                            size="1.25rem"
                        />
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action"
                        :disabled="isDeleting || isSavingRename"
                        aria-label="Rename"
                        title="Rename"
                        @click="startRename"
                    >
                        <Icon
                            name="solar:pen-linear"
                            size="1.25rem"
                        />
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action delete-button"
                        :disabled="isDeleting || isSavingRename"
                        :aria-busy="isDeleting"
                        aria-label="Delete file"
                        title="Delete file"
                        @click="handleDelete(file.id)"
                    >
                        <Icon
                            name="solar:trash-bin-trash-linear"
                            size="1.25rem"
                        />
                    </button>
                </div>

                <div
                    class="detail-tabs"
                    role="tablist"
                    aria-label="File information"
                    @keydown="handleTabKeydown"
                >
                    <button
                        id="file-details-tab"
                        type="button"
                        role="tab"
                        :aria-selected="activeTab === 'details'"
                        aria-controls="file-details-panel"
                        :tabindex="activeTab === 'details' ? 0 : -1"
                        :disabled="isSavingRename"
                        :class="{ active: activeTab === 'details' }"
                        @click="selectTab('details')"
                    >
                        Details
                    </button>
                    <button
                        id="file-edit-tab"
                        type="button"
                        role="tab"
                        :aria-selected="activeTab === 'edit'"
                        aria-controls="file-edit-panel"
                        :tabindex="activeTab === 'edit' ? 0 : -1"
                        :disabled="isSavingRename"
                        :class="{ active: activeTab === 'edit' }"
                        @click="selectTab('edit')"
                    >
                        Edit
                    </button>
                    <button
                        id="file-share-tab"
                        type="button"
                        role="tab"
                        aria-controls="file-share-panel"
                        :aria-selected="activeTab === 'share'"
                        :tabindex="activeTab === 'share' ? 0 : -1"
                        :disabled="isSavingRename"
                        :class="{ active: activeTab === 'share' }"
                        @click="selectTab('share')"
                    >
                        Share
                    </button>
                </div>

                <div
                    v-show="activeTab === 'details'"
                    id="file-details-panel"
                    role="tabpanel"
                    aria-labelledby="file-details-tab"
                    tabindex="0"
                    class="tab-panel"
                >
                    <dl class="file-metadata">
                        <div
                            v-for="row in metadataRows"
                            :key="row.label"
                            class="metadata-row"
                        >
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.value }}</dd>
                        </div>
                    </dl>
                </div>

                <div
                    v-show="activeTab === 'edit'"
                    id="file-edit-panel"
                    role="tabpanel"
                    aria-labelledby="file-edit-tab"
                    tabindex="0"
                    class="tab-panel edit-panel"
                >
                    <form
                        class="rename-form"
                        :aria-busy="isSavingRename"
                        @submit.prevent="saveRename"
                    >
                        <div class="rename-field">
                            <label for="file-rename-input">Filename</label>
                            <p>
                                Update the filename. The existing extension is preserved
                                automatically.
                            </p>
                            <div class="rename-input-group">
                                <input
                                    id="file-rename-input"
                                    ref="nameInput"
                                    v-model="editingFileName"
                                    type="text"
                                    class="name-input"
                                    maxlength="255"
                                    required
                                    autocomplete="off"
                                    :disabled="isSavingRename || isDeleting"
                                    :aria-invalid="Boolean(renameError)"
                                    :aria-describedby="
                                        renameError ? 'file-rename-error' : undefined
                                    "
                                    @input="renameError = ''"
                                    @keydown.esc.prevent="cancelRename"
                                />
                                <span
                                    class="rename-extension"
                                    aria-label="Current file extension"
                                    >{{ originalExtension || 'No extension' }}</span
                                >
                            </div>
                            <p
                                v-if="renameError"
                                id="file-rename-error"
                                class="rename-error"
                                role="alert"
                            >
                                {{ renameError }}
                            </p>
                        </div>
                        <div class="edit-actions">
                            <button
                                type="button"
                                class="action-button"
                                :disabled="isSavingRename"
                                @click="cancelRename"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="action-button download-button"
                                :disabled="!canSaveRename || isDeleting"
                                :aria-busy="isSavingRename"
                            >
                                {{ isSavingRename ? 'Saving...' : 'Save' }}
                            </button>
                        </div>
                    </form>
                    <div
                        v-if="canCopy"
                        class="copy-content"
                    >
                        <button
                            type="button"
                            class="action-button"
                            :disabled="isCopying || isDeleting || isSavingRename"
                            :aria-busy="isCopying"
                            @click="handleCopy"
                        >
                            <Icon name="solar:copy-linear" />
                            {{ isCopying ? 'Copying...' : 'Copy content' }}
                        </button>
                    </div>
                </div>
                <div
                    v-show="activeTab === 'share'"
                    id="file-share-panel"
                    role="tabpanel"
                    aria-labelledby="file-share-tab"
                    tabindex="0"
                    class="tab-panel"
                >
                    <ShareBox
                        :item-id="file.id"
                        item-type="file"
                        :initial-state="shareStatus"
                        embedded
                        @changed="handleShareChanged"
                    />
                </div>
            </section>
        </aside>
    </div>
    <div
        v-else
        class="file-empty-state"
        role="alert"
    >
        <h1>Unable to load file</h1>
        <p>The file could not be found or accessed.</p>
        <div class="edit-actions">
            <button
                type="button"
                class="action-button"
                @click="goBack"
            >
                Back to {{ returnPage.name }}
            </button>
            <button
                type="button"
                class="action-button download-button"
                @click="refresh()"
            >
                Try again
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { canCopyFile, getFileIcon, getFileType, formatFileSize, formatFileTime } from '~/utils/file'
import { getFileReturnPage } from '~/utils/fileNavigation'
import { emptyShareState, type ShareState } from '~~/shared/types/share'
import type { FileTechnicalMetadata } from '~~/shared/types/fileMetadata'

definePageMeta({
    middleware: ['auth', 'file-origin'],
    layout: 'user',
    key: route => route.path
})

interface FileData {
    id: string
    user_id: string
    folder_id: string | null
    name: string
    original_name: string
    mime_type: string | null
    size: string
    technical_metadata?: FileTechnicalMetadata
    folders?: { id: string; name: string } | null
    share?: ShareState
    storage_key: string
    created_at: string | null
    updated_at: string | null
}

type DetailTab = 'details' | 'edit' | 'share'

const route = useRoute()
const router = useRouter()
const fileId = route.params.id as string

const returnPage = computed(
    () => getFileReturnPage(route.query.from) ?? { path: '/files', name: 'Files' }
)

const { data: file, refresh } = await useFetch<FileData>(`/api/files/${encodeURIComponent(fileId)}`)
const { deleteFile, renameFile, downloadFile, copyFile, isDeleting } = useFileActions()
const { addFavorite, removeFavorite } = useFavoriteActions()
const { files, folders, favorites, fetchAll } = useUser()
const { openToast } = useToast()

const shareStatus = ref<ShareState>(file.value?.share ?? emptyShareState())

const handleShareChanged = (state: ShareState) => {
    shareStatus.value = state
    if (file.value) file.value.share = state
}

const fileHeader = useFileHeader()

const displayFileName = computed(() => file.value?.original_name || file.value?.name || '')

watch(
    [displayFileName, returnPage],
    ([fileName, back]) => {
        if (file.value)
            fileHeader.value = { fileId, fileName, returnName: back.name, returnPath: back.path }
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    if (fileHeader.value?.fileId === fileId) fileHeader.value = null
})

const originalExtension = computed(() => {
    const name = file.value?.original_name ?? ''
    return name.includes('.') ? `.${name.split('.').pop()}` : ''
})

const editableFileName = computed(() => {
    const name = displayFileName.value
    return originalExtension.value && name.length > originalExtension.value.length
        ? name.slice(0, -originalExtension.value.length)
        : name
})

const renameTargetName = computed(() => {
    const name = editingFileName.value.trim()
    const extension = originalExtension.value

    return extension &&
        name !== editableFileName.value &&
        name.toLowerCase().endsWith(extension.toLowerCase())
        ? name.slice(0, -extension.length).trim()
        : name
})

const activeTab = ref<DetailTab>('details')
const isRenaming = ref(false)
const editingFileName = ref(editableFileName.value)
const nameInput = ref<HTMLInputElement | null>(null)
const renameError = ref('')
const isSavingRename = ref(false)
const isCopying = ref(false)
const isDownloading = ref(false)
const isUpdatingFavorite = ref(false)

const canCopy = computed(() => canCopyFile(file.value?.mime_type, file.value?.original_name))

const canSaveRename = computed(
    () =>
        !isSavingRename.value &&
        !!renameTargetName.value &&
        renameTargetName.value !== editableFileName.value
)

const goBack = () => router.push(returnPage.value.path)

const startRename = async () => {
    if (!file.value || isSavingRename.value || isDeleting.value) return
    if (!isRenaming.value) {
        editingFileName.value = editableFileName.value
        renameError.value = ''
        isRenaming.value = true
    }
    activeTab.value = 'edit'
    await nextTick()
    nameInput.value?.focus()
    nameInput.value?.select()
}

const selectTab = async (tab: DetailTab) => {
    if (isSavingRename.value) return
    if (tab === 'edit') await startRename()
    else activeTab.value = tab
}

const handleTabKeydown = async (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || isSavingRename.value)
        return
    event.preventDefault()
    const tabs: DetailTab[] = ['details', 'edit', 'share']
    const current = tabs.indexOf(activeTab.value)
    const index =
        event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 2
              : (current + (event.key === 'ArrowRight' ? 1 : 2)) % 3
    const tab = tabs[index]!
    await selectTab(tab)
    await nextTick()
    document
        .getElementById(
            tab === 'details'
                ? 'file-details-tab'
                : tab === 'edit'
                  ? 'file-edit-tab'
                  : 'file-share-tab'
        )
        ?.focus()
}

const cancelRename = () => {
    if (isSavingRename.value) return
    editingFileName.value = editableFileName.value
    renameError.value = ''
    isRenaming.value = false
    activeTab.value = 'details'
}

const saveRename = async () => {
    if (!file.value || !isRenaming.value || isSavingRename.value || isDeleting.value) return
    const newName = renameTargetName.value
    if (!newName) {
        renameError.value = 'Filename is required.'
        return
    }
    if (newName === editableFileName.value) {
        cancelRename()
        return
    }
    isSavingRename.value = true
    renameError.value = ''
    try {
        const response = await renameFile(file.value.id, newName)
        file.value = { ...file.value, ...response.file }
        const listedFile = files.value.find(item => item.id === response.file.id)
        if (listedFile) Object.assign(listedFile, response.file)
        editingFileName.value = editableFileName.value
        isRenaming.value = false
        activeTab.value = 'details'
        openToast('File renamed successfully.', 'success')
    } catch (err: any) {
        renameError.value = err?.data?.message || err?.message || 'File could not be renamed.'
        openToast(renameError.value, 'error')
    } finally {
        isSavingRename.value = false
    }
}

watch(editableFileName, name => {
    if (!isRenaming.value) editingFileName.value = name
})

const handleDownload = async (id: string) => {
    if (isDownloading.value) return
    isDownloading.value = true
    try {
        await downloadFile(id)
        openToast('Download started.', 'success')
    } catch (err: any) {
        openToast(err?.data?.message || err?.message || 'File could not be downloaded.', 'error')
    } finally {
        isDownloading.value = false
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
            err?.data?.message || err?.message || 'File could not be copied to the clipboard.',
            'error'
        )
    } finally {
        isCopying.value = false
    }
}

const handleDelete = async (id: string) => {
    if (isDeleting.value || isSavingRename.value) return
    try {
        await deleteFile(id)
        await goBack()
    } catch (err: any) {
        openToast(err?.data?.message || err?.message || 'File could not be deleted.', 'error')
    }
}

const isFileFavorite = (id: string) => favorites.value.some(favorite => favorite.file_id === id)

const handleFavorite = async (item: FileData) => {
    if (isUpdatingFavorite.value) return
    isUpdatingFavorite.value = true
    try {
        if (isFileFavorite(item.id)) {
            await removeFavorite(item.id, 'file')
            openToast('File removed from favorites.', 'success')
        } else {
            await addFavorite(item.id, 'file')
            openToast('File favorited successfully.', 'success')
        }
        await fetchAll()
    } catch (err: any) {
        openToast(err?.data?.message || err?.message || 'File could not be favorited.', 'error')
    } finally {
        isUpdatingFavorite.value = false
    }
}

const previewUrl = computed(() => `/api/files/${encodeURIComponent(fileId)}/preview`)

const isImage = computed(() => file.value?.mime_type?.startsWith('image/') ?? false)

const isText = computed(() => file.value?.mime_type?.startsWith('text/') ?? false)

const isVideo = computed(() => file.value?.mime_type?.startsWith('video/') ?? false)

const isPdf = computed(() => file.value?.mime_type === 'application/pdf')

const fileExtension = computed(() => {
    const name = file.value?.original_name ?? ''
    const dot = name.lastIndexOf('.')
    return dot > 0 && dot < name.length - 1 ? getFileType(name) : ''
})

const textContent = ref('')
const previewError = ref('')
const imagePreview = ref<HTMLImageElement | null>(null)
const videoPreview = ref<HTMLVideoElement | null>(null)
const mediaDimensions = ref<{ width: number; height: number } | null>(null)
const mediaDuration = ref<number | null>(null)

const handlePreviewError = () => {
    mediaDimensions.value = null
    mediaDuration.value = null
    previewError.value = 'File preview could not be loaded.'
}

const captureImageMetadata = (event?: Event) => {
    const image = (event?.target as HTMLImageElement | null) ?? imagePreview.value
    if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
        mediaDimensions.value = { width: image.naturalWidth, height: image.naturalHeight }
    }
}

const captureVideoMetadata = (event?: Event) => {
    const video = (event?.target as HTMLVideoElement | null) ?? videoPreview.value
    if (!video) return
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        mediaDimensions.value = { width: video.videoWidth, height: video.videoHeight }
    }
    mediaDuration.value =
        Number.isFinite(video.duration) && video.duration >= 0 ? video.duration : null
}

onMounted(() => {
    captureImageMetadata()
    if ((videoPreview.value?.readyState ?? 0) >= 1) captureVideoMetadata()
})

const formatDateTime = (date: string) => {
    if (!Number.isFinite(new Date(date).getTime())) return ''
    return `${formatFileTime(date)} ${new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

const metadataRows = computed(() => {
    if (!file.value) return []
    const item = file.value
    const technical = item.technical_metadata ?? {}
    const dimensions =
        mediaDimensions.value ??
        (technical.width && technical.height
            ? { width: technical.width, height: technical.height }
            : null)
    const duration = mediaDuration.value ?? technical.duration
    const rows: { label: string; value: string }[] = []
    const add = (label: string, value: string | number | null | undefined) =>
        rows.push({
            label,
            value:
                value === null || value === undefined || value === ''
                    ? 'Unavailable'
                    : String(value)
        })
    add('Full filename', displayFileName.value)
    add('Extension', fileExtension.value || 'None')
    add('MIME type', item.mime_type)
    add('Size', formatFileSize(item.size))
    add('Created', item.created_at ? formatDateTime(item.created_at) : null)
    add('Modified', item.updated_at ? formatDateTime(item.updated_at) : null)
    add(
        'Folder',
        item.folder_id
            ? (item.folders?.name ??
                  folders.value.find(folder => folder.id === item.folder_id)?.name ??
                  item.folder_id)
            : 'None'
    )
    add('Favorite status', isFileFavorite(item.id) ? 'Favorited' : 'Not favorited')
    add(
        'Sharing status',
        !shareStatus.value.url ? 'Not shared' : shareStatus.value.isExpired ? 'Expired' : 'Active'
    )
    add('Password protection', shareStatus.value.hasPassword ? 'Enabled' : 'Disabled')
    add(
        'Link expiration',
        shareStatus.value.expiresAt ? formatDateTime(shareStatus.value.expiresAt) : 'Never'
    )
    if (isVideo.value) {
        add('Resolution', dimensions ? `${dimensions.width} × ${dimensions.height}` : null)
        add(
            'Duration',
            duration !== undefined && duration !== null
                ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
                : null
        )
        add('FPS', technical.fps ? `${Number(technical.fps.toFixed(3))} fps` : null)
    }
    if (isImage.value) {
        add('Width', dimensions?.width)
        add('Height', dimensions?.height)
        add('Image format', technical.format || fileExtension.value)
    }
    if (item.mime_type?.startsWith('audio/')) {
        add(
            'Duration',
            technical.duration !== undefined
                ? `${Math.floor(technical.duration / 60)}:${String(Math.floor(technical.duration % 60)).padStart(2, '0')}`
                : null
        )
    }
    return rows
})

if (isText.value) {
    try {
        textContent.value = await $fetch<string>(previewUrl.value, { responseType: 'text' })
    } catch {
        handlePreviewError()
    }
}
</script>

<style scoped>
.file-page {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 27rem;
    gap: 1rem;
}

.file-workspace,
.file-panel {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.preview-card {
    flex: 1;
    min-height: 0;
    display: flex;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;
    overflow: hidden;
}

.preview-content {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    overflow: auto;
    box-sizing: border-box;
}

.preview-content img,
.preview-content video,
.preview-content iframe {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: contain;
    border-radius: 6px;
    border: none;
}

.preview-content video {
    background: #000;
}

.preview-content.text-preview {
    display: block;
    overscroll-behavior: contain;
}

.preview-content pre {
    margin: 0;
    color: #d5d5da;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.7;
}

.preview-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    max-width: 24rem;
    color: #898991;
    text-align: center;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.preview-message :deep(.iconify) {
    color: #8b7cff;
}

.preview-message p {
    margin: 0;
    color: #d5d5da;
    font-size: 0.875rem;
}

.file-panel {
    overflow-y: auto;
    overscroll-behavior: contain;
}

.file-information {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 12px;
    box-sizing: border-box;
}

.file-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.file-heading-text {
    flex: 1;
    min-width: 0;
}

.file-heading h1 {
    margin: 0;
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.file-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0.375rem 0 0;
    color: #898991;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.close-details {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    color: #cfcfd5;
    background: transparent;
    border: none;
    cursor: pointer;
}

.close-details:hover {
    background: #29292e;
    color: #ffffff;
}

.file-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(3, 3.25rem);
    gap: 0.75rem;
}

.action-button {
    min-width: 0;
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 6px;
    box-sizing: border-box;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.action-button:hover:not(:disabled) {
    background: #29292e;
    color: #ffffff;
    border-color: #3a3a41;
}

.icon-action {
    width: 3.25rem;
    padding: 0;
}

.icon-action[aria-pressed='true'] {
    color: #8b7cff;
}

.download-button {
    background: #3c47be;
    color: #ffffff;
    border-color: #3c47be;
}

.download-button:hover:not(:disabled) {
    background: #4652d1;
    border-color: #4652d1;
}

.delete-button {
    background: #352024;
    color: #ff6b6b;
    border-color: #4a292d;
}

.delete-button:hover:not(:disabled) {
    background: #3a2024;
    color: #ff7d7d;
    border-color: #4a292d;
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.action-button[aria-busy='true'] {
    cursor: wait;
}

.detail-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.25rem;
    padding: 0.25rem;
    background: #151518;
    border: 1px solid #29292e;
    border-radius: 6px;
}

.detail-tabs button {
    min-height: 2rem;
    padding: 0.375rem 0.5rem;
    color: #898991;
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
}

.detail-tabs button:hover {
    color: #ffffff;
}

.detail-tabs button.active {
    background: #242429;
    color: #ffffff;
    font-weight: 600;
}

.detail-tabs button:disabled {
    cursor: wait;
}

.tab-panel {
    min-width: 0;
}

.file-metadata {
    margin: 0;
    border: 1px solid #29292e;
    border-radius: 6px;
    overflow: hidden;
}

.metadata-row {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: start;
    gap: 0.75rem;
    padding: 0.5rem 0.875rem;
    border-bottom: 1px solid #29292e;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.metadata-row:last-child {
    border-bottom: none;
}

.metadata-row dt {
    color: #898991;
}

.metadata-row dd {
    min-width: 0;
    margin: 0;
    color: #d5d5da;
    overflow-wrap: anywhere;
}

.rename-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.rename-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.rename-field label {
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 500;
}

.rename-field p {
    margin: 0;
    color: #898991;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.name-input {
    width: 100%;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.625rem 0.75rem;
    color: #ffffff;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 6px;
    box-sizing: border-box;
    font-size: 0.875rem;
    line-height: 1.5;
    outline: none;
}

.name-input:focus {
    border-color: #5965ed;
}

.name-input[aria-invalid='true'] {
    border-color: #ff6b6b;
}

.rename-field .rename-error {
    color: #ff6b6b;
}

.edit-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.copy-content {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #29292e;
}

.file-page button:focus-visible,
.tab-panel:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 2px;
}

.file-empty-state {
    padding: 1.5rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 12px;
    color: #d5d5da;
}

.file-empty-state h1 {
    margin: 0;
    color: #ffffff;
    font-size: 1.25rem;
}

.file-empty-state p {
    font-size: 0.875rem;
    line-height: 1.5;
}

@media (max-width: 1100px) and (min-width: 901px) {
    .file-page {
        grid-template-columns: minmax(0, 1fr) 22rem;
        gap: 0.75rem;
    }

    .file-actions {
        gap: 0.5rem;
    }
}

@media (max-width: 900px) {
    .file-page {
        height: auto;
        min-height: 100%;
        grid-template-columns: minmax(0, 1fr);
    }

    .preview-card {
        flex: none;
        height: 36rem;
    }

    .file-panel {
        overflow: visible;
    }

    .file-information {
        flex: none;
    }
}

@media (max-width: 500px) {
    .preview-content {
        padding: 0.75rem;
    }

    .preview-card {
        height: 24rem;
    }

    .file-information {
        padding: 0.75rem;
    }

    .file-actions {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.5rem;
    }

    .file-actions .download-button {
        grid-column: 1 / -1;
    }

    .icon-action {
        width: 100%;
    }

    .action-button {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .metadata-row {
        gap: 0.5rem;
        padding: 0.5rem 0.625rem;
    }
}

.rename-input-group {
    display: flex;
    align-items: stretch;
    min-width: 0;
    border: 1px solid #303036;
    border-radius: 6px;
    overflow: hidden;
}

.rename-input-group:focus-within {
    border-color: #5965ed;
}

.rename-input-group .name-input {
    flex: 1;
    border: none;
}

.rename-extension {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 35%;
    overflow: hidden;
    padding: 0 0.625rem;
    background: #151518;
    border-left: 1px solid #303036;
    color: #898991;
    font-size: 0.8125rem;
    white-space: nowrap;
}
</style>
