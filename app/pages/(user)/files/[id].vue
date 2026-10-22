<template>
    <div
        v-if="file"
        class="file-page min-w-0 min-h-0 grid grid-cols-[minmax(0,_1fr)_27rem] gap-4
        details-middle:grid-cols-[minmax(0,_1fr)_22rem] details-middle:gap-3 max-preview:h-auto
        max-preview:min-h-full max-preview:grid-cols-1 size-full"
    >
        <section class="file-workspace min-w-0 min-h-0 flex flex-col gap-3">
            <div class="preview-card flex-1 min-h-0 flex bg-surface border border-divider rounded-3xl overflow-hidden
                max-preview:flex-none max-preview:h-144 max-phone:h-96">
                <div
                    class="preview-content flex-1 min-w-0 min-h-0 flex items-center justify-center p-5 overflow-auto
                    text-preview:block text-preview:overscroll-contain max-phone:p-3"
                    :class="{ 'text-preview': isText && !previewError }"
                >
                    <div
                        v-if="previewError"
                        class="preview-message flex flex-col items-center gap-3 max-w-96 text-muted text-center text-[0.8125rem]
                        leading-normal"
                    >
                        <Icon class="text-accent"
                            name="solar:document-linear"
                            size="3rem"
                        />
                        <p class="m-0 text-[#d5d5da] text-sm leading-[inherit]">{{ previewError }}</p>
                        <span>Use the Download button to download this file.</span>
                    </div>
                    <img class="block min-h-0 object-contain rounded-md border-0 size-full"
                        v-else-if="isImage"
                        ref="imagePreview"
                        :src="previewUrl"
                        :alt="displayFileName"
                        @load="captureImageMetadata"
                        @error="handlePreviewError"
                    />
                    <pre class="m-0 text-[#d5d5da] whitespace-pre-wrap wrap-anywhere font-mono text-[0.85rem] leading-[1.7]" v-else-if="isText">{{ textContent }}</pre>
                    <iframe class="block min-h-0 object-contain rounded-md border-0 size-full"
                        v-else-if="isPdf"
                        :src="previewUrl"
                        title="PDF preview"
                    />
                    <video class="block min-h-0 object-contain rounded-md border-0 bg-black size-full"
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
                        class="preview-message flex flex-col items-center gap-3 max-w-96 text-muted text-center text-[0.8125rem]
                        leading-normal"
                    >
                        <Icon class="text-accent"
                            :name="getFileIcon(file.mime_type, file.original_name)"
                            size="3.75rem"
                        />
                        <p class="m-0 text-[#d5d5da] text-sm leading-[inherit]">Preview is not available for this file type.</p>
                        <span>Use the Download button to download this file.</span>
                    </div>
                </div>
            </div>
        </section>

        <aside class="file-panel min-w-0 min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-contain
            max-preview:overflow-visible">
            <section class="file-information flex-none min-w-0 flex flex-col gap-3 p-3.5 bg-surface border border-divider
                rounded-xl max-preview:flex-none max-phone:p-3">
                <div class="file-heading flex items-start gap-3">
                    <div class="file-heading-text flex-1 min-w-0">
                        <h1 class="m-0 text-white text-xl font-semibold leading-[1.35] wrap-anywhere" id="file-detail-title">{{ displayFileName }}</h1>
                        <p class="file-summary flex items-center flex-wrap gap-1.5 mt-1.5 mr-0 mb-0 ml-0 text-muted text-[0.8125rem]
                            leading-normal">
                            <span>{{ formatFileSize(file.size) }}</span>
                            <template v-if="file.created_at">
                                <span>·</span>
                                <span>{{ formatDateTime(file.created_at) }}</span>
                            </template>
                        </p>
                    </div>
                    <button
                        type="button"
                        class="close-details shrink-0 grid place-items-center p-0 text-[#cfcfd5] bg-transparent border-0
                        cursor-pointer hover:bg-divider hover:text-white focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 size-7"
                        :title="`Back to ${returnPage.name}`"
                        @click="goBack"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
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

                <div class="file-actions grid grid-cols-[minmax(0,_1fr)_repeat(3,_3.25rem)] gap-3 details-middle:gap-2
                    max-phone:grid-cols-3 max-phone:gap-2">
                    <button
                        type="button"
                        class="action-button download-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2
                        px-3.5 text-white bg-primary border rounded-md text-sm font-medium leading-normal cursor-pointer
                        transition-colors duration-200 ease-[ease] border-primary hover:enabled:bg-[#4652d1]
                        hover:enabled:text-white hover:enabled:border-[#4652d1] disabled:opacity-60
                        disabled:cursor-not-allowed busy:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:col-span-full max-phone:pl-2 max-phone:pr-2"
                        :class="{ 'is-busy': isDownloading }"
                        :disabled="isDownloading || isDeleting || isSavingRename"
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
                        class="action-button icon-action min-w-0 min-h-11 inline-flex items-center justify-center gap-2 p-0
                        text-[#cfcfd5] bg-control border border-control-border rounded-md text-sm font-medium leading-normal
                        cursor-pointer transition-colors duration-200 ease-[ease] w-13 hover:enabled:bg-divider
                        hover:enabled:text-white hover:enabled:border-[#3a3a41] favorite:text-accent disabled:opacity-60
                        disabled:cursor-not-allowed busy:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2 max-phone:pr-2"
                        :class="{
                            'is-favorite': isFileFavorite(file.id),
                            'is-busy': isUpdatingFavorite
                        }"
                        :disabled="isUpdatingFavorite || isDeleting || isSavingRename"
                        :title="
                            isFileFavorite(file.id) ? 'Remove from favorites' : 'Add to favorites'
                        "
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
                        class="action-button icon-action min-w-0 min-h-11 inline-flex items-center justify-center gap-2 p-0
                        text-[#cfcfd5] bg-control border border-control-border rounded-md text-sm font-medium leading-normal
                        cursor-pointer transition-colors duration-200 ease-[ease] w-13 hover:enabled:bg-divider
                        hover:enabled:text-white hover:enabled:border-[#3a3a41] disabled:opacity-60
                        disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2 max-phone:pr-2"
                        :disabled="isDeleting || isSavingRename"
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
                        class="action-button icon-action delete-button min-w-0 min-h-11 inline-flex items-center justify-center
                        gap-2 p-0 text-[#ff6b6b] bg-[#352024] border rounded-md text-sm font-medium leading-normal
                        cursor-pointer transition-colors duration-200 ease-[ease] w-13 border-[#4a292d]
                        hover:enabled:bg-[#3a2024] hover:enabled:text-[#ff7d7d] hover:enabled:border-[#4a292d]
                        disabled:opacity-60 disabled:cursor-not-allowed busy:cursor-wait focus-visible:outline-2
                        focus-visible:outline-accent focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2
                        max-phone:pr-2"
                        :class="{ 'is-busy': isDeleting }"
                        :disabled="isDeleting || isSavingRename"
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
                    class="detail-tabs grid grid-cols-3 gap-1 p-1 bg-[#151518] border border-divider rounded-md"
                    @keydown="handleTabKeydown"
                >
                    <button class="min-h-8 py-1.5 px-2 text-muted bg-transparent border-0 rounded-md text-sm font-medium leading-normal
                        cursor-pointer hover:text-white is-active:bg-raised is-active:text-white is-active:font-semibold
                        disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2"
                        id="file-details-tab"
                        type="button"
                        :tabindex="activeTab === 'details' ? 0 : -1"
                        :disabled="isSavingRename"
                        :class="{ active: activeTab === 'details' }"
                        @click="selectTab('details')"
                    >
                        Details
                    </button>
                    <button class="min-h-8 py-1.5 px-2 text-muted bg-transparent border-0 rounded-md text-sm font-medium leading-normal
                        cursor-pointer hover:text-white is-active:bg-raised is-active:text-white is-active:font-semibold
                        disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2"
                        id="file-edit-tab"
                        type="button"
                        :tabindex="activeTab === 'edit' ? 0 : -1"
                        :disabled="isSavingRename"
                        :class="{ active: activeTab === 'edit' }"
                        @click="selectTab('edit')"
                    >
                        Edit
                    </button>
                    <button class="min-h-8 py-1.5 px-2 text-muted bg-transparent border-0 rounded-md text-sm font-medium leading-normal
                        cursor-pointer hover:text-white is-active:bg-raised is-active:text-white is-active:font-semibold
                        disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2"
                        id="file-share-tab"
                        type="button"
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
                    tabindex="0"
                    class="tab-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                    <dl class="file-metadata m-0 border border-divider rounded-md overflow-hidden">
                        <div
                            v-for="row in metadataRows"
                            :key="row.label"
                            class="metadata-row grid grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] items-start gap-3 py-2 px-3.5 border-b
                            border-b-divider text-[0.8125rem] leading-normal last:border-b-0 max-phone:gap-2 max-phone:py-2
                            max-phone:px-2.5"
                        >
                            <dt class="text-muted">{{ row.label }}</dt>
                            <dd class="min-w-0 m-0 text-[#d5d5da] wrap-anywhere">{{ row.value }}</dd>
                        </div>
                    </dl>
                </div>

                <div
                    v-show="activeTab === 'edit'"
                    id="file-edit-panel"
                    tabindex="0"
                    class="tab-panel edit-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent
                    focus-visible:outline-offset-2"
                >
                    <form
                        class="rename-form flex flex-col gap-4"
                        @submit.prevent="saveRename"
                    >
                        <div class="rename-field flex flex-col gap-2">
                            <label class="text-white text-sm leading-[inherit] font-medium" for="file-rename-input">Filename</label>
                            <p class="m-0 text-muted text-[0.8125rem] leading-normal">
                                Update the filename. The existing extension is preserved
                                automatically.
                            </p>
                            <div class="rename-input-group flex items-stretch min-w-0 border border-control-border rounded-md overflow-hidden
                                focus-within:border-[#5965ed]">
                                <input
                                    id="file-rename-input"
                                    ref="nameInput"
                                    v-model="editingFileName"
                                    type="text"
                                    class="name-input w-full min-w-0 min-h-11 py-2.5 px-3 text-white bg-control border-0 rounded-md text-sm
                                    leading-normal outline-none flex-1 focus:border-[#5965ed] is-invalid:border-[#ff6b6b]"
                                    :class="{ invalid: Boolean(renameError) }"
                                    maxlength="255"
                                    required
                                    autocomplete="off"
                                    :disabled="isSavingRename || isDeleting"
                                    @input="renameError = ''"
                                    @keydown.esc.prevent="cancelRename"
                                />
                                <span class="rename-extension flex items-center shrink-0 max-w-[35%] overflow-hidden py-0 px-2.5 bg-[#151518]
                                    border-l border-l-control-border text-muted text-[0.8125rem] whitespace-nowrap">{{
                                    originalExtension || 'No extension'
                                }}</span>
                            </div>
                            <p
                                v-if="renameError"
                                id="file-rename-error"
                                class="rename-error m-0 text-[#ff6b6b] text-[0.8125rem] leading-normal"
                            >
                                {{ renameError }}
                            </p>
                        </div>
                        <div class="edit-actions flex justify-end flex-wrap gap-2">
                            <button
                                type="button"
                                class="action-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2 px-3.5
                                text-[#cfcfd5] bg-control border border-control-border rounded-md text-sm font-medium leading-normal
                                cursor-pointer transition-colors duration-200 ease-[ease] hover:enabled:bg-divider
                                hover:enabled:text-white hover:enabled:border-[#3a3a41] disabled:opacity-60
                                disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                                focus-visible:outline-offset-2 max-phone:pl-2 max-phone:pr-2"
                                :disabled="isSavingRename"
                                @click="cancelRename"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="action-button download-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2
                                px-3.5 text-white bg-primary border rounded-md text-sm font-medium leading-normal cursor-pointer
                                transition-colors duration-200 ease-[ease] border-primary hover:enabled:bg-[#4652d1]
                                hover:enabled:text-white hover:enabled:border-[#4652d1] disabled:opacity-60
                                disabled:cursor-not-allowed busy:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                                focus-visible:outline-offset-2 max-phone:pl-2 max-phone:pr-2"
                                :class="{ 'is-busy': isSavingRename }"
                                :disabled="!canSaveRename || isDeleting"
                            >
                                {{ isSavingRename ? 'Saving...' : 'Save' }}
                            </button>
                        </div>
                    </form>
                    <div
                        v-if="canCopy"
                        class="copy-content mt-4 pt-4 border-t border-t-divider"
                    >
                        <button
                            type="button"
                            class="action-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2 px-3.5
                            text-[#cfcfd5] bg-control border border-control-border rounded-md text-sm font-medium leading-normal
                            cursor-pointer transition-colors duration-200 ease-[ease] hover:enabled:bg-divider
                            hover:enabled:text-white hover:enabled:border-[#3a3a41] disabled:opacity-60
                            disabled:cursor-not-allowed busy:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                            focus-visible:outline-offset-2 max-phone:pl-2 max-phone:pr-2"
                            :class="{ 'is-busy': isCopying }"
                            :disabled="isCopying || isDeleting || isSavingRename"
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
                    tabindex="0"
                    class="tab-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
        class="file-empty-state p-6 bg-surface border border-divider rounded-xl text-[#d5d5da]"
    >
        <h1 class="m-0 text-white text-xl leading-[inherit]">Unable to load file</h1>
        <p class="text-sm leading-normal">The file could not be found or accessed.</p>
        <div class="edit-actions flex justify-end flex-wrap gap-2">
            <button
                type="button"
                class="action-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2 px-3.5
                text-[#cfcfd5] bg-control border border-control-border rounded-md text-sm font-medium leading-normal
                cursor-pointer transition-colors duration-200 ease-[ease] hover:enabled:bg-divider
                hover:enabled:text-white hover:enabled:border-[#3a3a41] disabled:opacity-60
                disabled:cursor-not-allowed max-phone:pl-2 max-phone:pr-2"
                @click="goBack"
            >
                Back to {{ returnPage.name }}
            </button>
            <button
                type="button"
                class="action-button download-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2
                px-3.5 text-white bg-primary border rounded-md text-sm font-medium leading-normal cursor-pointer
                transition-colors duration-200 ease-[ease] border-primary hover:enabled:bg-[#4652d1]
                hover:enabled:text-white hover:enabled:border-[#4652d1] disabled:opacity-60
                disabled:cursor-not-allowed max-phone:pl-2 max-phone:pr-2"
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
