
<script setup lang="ts">
import { useEventListener, useFullscreen } from '@vueuse/core'

const route = useRoute()

const token = computed(() => route.params.token as string)

interface SharedResponse {
    type: 'file' | 'folder' | 'note'
    sharedBy: string
    item: any
}

const sharedUrl = computed(() => {
    return `/api/shared/${token.value}`
})

const { data: sharedItem, error } = await useFetch<SharedResponse>(
    sharedUrl
)

const isImage = computed(() => {
    return sharedItem.value?.type === 'file' &&
        sharedItem.value.item.mime_type?.startsWith('image/')
})

const imageStage = ref<HTMLElement | null>(null)
const isImageExpanded = ref(false)
const { isSupported: supportsFullscreen, isFullscreen, toggle: toggleFullscreen } = useFullscreen(
    imageStage,
    { autoExit: true }
)
const isImageFullscreen = computed(() => isFullscreen.value || isImageExpanded.value)

const toggleImageFullscreen = async () => {
    if (isImageExpanded.value) {
        isImageExpanded.value = false
        return
    }

    if (!supportsFullscreen.value) {
        isImageExpanded.value = true
        return
    }

    try {
        await toggleFullscreen()
    } catch {
        if (!isFullscreen.value) {
            isImageExpanded.value = true
        }
    }
}

useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        isImageExpanded.value = false
    }
})

const isText = computed(() => {
    return sharedItem.value?.type === 'file' &&
        sharedItem.value.item.mime_type?.startsWith('text/')
})

const isPdf = computed(() => {
    return sharedItem.value?.type === 'file' &&
        sharedItem.value.item.mime_type === 'application/pdf'
})

const isVideo = computed(() => {
    return sharedItem.value?.type === 'file' &&
        sharedItem.value.item.mime_type?.startsWith('video/')
})

const itemName = computed(() => {
    if (!sharedItem.value) return ''

    if (sharedItem.value.type === 'note') {
        return sharedItem.value.item.title
    }

    return sharedItem.value.item.name
})

const isDownloadOnly = computed(() => {
    return sharedItem.value?.type === 'file' &&
        !isImage.value &&
        !isText.value &&
        !isPdf.value &&
        !isVideo.value
})

const downloadUrl = computed(() => {
    return `/api/shared/${token.value}/download`
})

const isDownloading = ref(false)
const downloadError = ref(false)
const downloadedToken = ref<string | null>(null)

const autoDownload = () => {
    if (!import.meta.client) return
    if (!isDownloadOnly.value) return
    if (isDownloading.value) return
    if (downloadedToken.value === token.value) return

    isDownloading.value = true
    downloadError.value = false
    downloadedToken.value = token.value

    const link = document.createElement('a')

    link.href = downloadUrl.value
    link.download = itemName.value

    document.body.appendChild(link)
    link.click()
    link.remove()

    isDownloading.value = false
}

watch(
    [token, isDownloadOnly],
    () => {
        if (isDownloadOnly.value) {
            autoDownload()
        }
    },
    { immediate: true }
)

const manualDownload = () => {
    downloadedToken.value = null
    autoDownload()
}

const textContent = ref('')
const textPreviewError = ref(false)

const loadTextPreview = async () => {
    textContent.value = ''
    textPreviewError.value = false

    if (!isText.value) return

    try {
        textContent.value = await $fetch<string>(
            `/api/shared/${token.value}/preview`
        )
    } catch {
        textPreviewError.value = true
    }
}

watch(
    [token, isText],
    () => {
        loadTextPreview()
    },
    {
        immediate: true
    }
)
</script>

<template>
    <div class="shared-page">
        <div v-if="error" class="shared-error" role="alert">
            <div class="shared-error-card">
                <div class="shared-error-icon" aria-hidden="true">
                    <Icon
                        :name="error.statusCode === 404 ? 'solar:link-broken-linear' : 'solar:danger-circle-linear'"
                        size="2.75rem"
                    />
                </div>

                <span class="shared-error-code">{{ error.statusCode || 'Error' }}</span>

                <h1>
                    {{ error.statusCode === 404 ? 'Shared item not found' : 'Unable to load shared item' }}
                </h1>

                <p>
                    {{
                        error.statusCode === 404
                            ? 'This link may be invalid or no longer available. Ask the sender for a new link.'
                            : 'Something went wrong while opening this link. Please try again in a moment.'
                    }}
                </p>
            </div>
        </div>

        <template v-else-if="sharedItem">
            <div
                v-if="sharedItem.type === 'file'"
                class="shared-content"
                :class="{
                    'media-content': isImage || isPdf || isVideo,
                    'image-content': isImage,
                    'text-content': isText
                }"
            >
                <div
                    v-if="isImage"
                    ref="imageStage"
                    class="image-stage"
                    :class="{ 'is-expanded': isImageExpanded }"
                >
                    <img
                        class="image-preview"
                        :src="`/api/shared/${token}/preview`"
                        :alt="sharedItem.item.name"
                    >

                    <button
                        type="button"
                        class="image-fullscreen-btn"
                        :aria-label="isImageFullscreen ? 'Exit fullscreen' : 'View fullscreen'"
                        :title="isImageFullscreen ? 'Exit fullscreen' : 'View fullscreen'"
                        :aria-pressed="isImageFullscreen"
                        @click="toggleImageFullscreen"
                    >
                        <Icon
                            :name="isImageFullscreen ? 'solar:quit-full-screen-linear' : 'solar:full-screen-linear'"
                            size="1.2rem"
                        />
                    </button>
                </div>

                <template v-else-if="isText">
                    <div v-if="textPreviewError" class="error-message">
                        Text preview could not be loaded.
                    </div>

                    <pre
                        v-else
                        class="text-preview"
                    >{{ textContent }}</pre>
                </template>

                <iframe
                    v-else-if="isPdf"
                    class="pdf-preview"
                    :src="`/api/shared/${token}/preview`"
                    :title="itemName"
                />

                <video
                    v-else-if="isVideo"
                    class="video-preview"
                    :src="`/api/shared/${token}/preview`"
                    controls
                    autoplay
                    muted
                    playsinline
                    preload="auto"
                />

                <div v-else class="download-message">
                    <div class="download-icon" aria-hidden="true">
                        <Icon
                            name="solar:file-bold"
                            size="3rem"
                        />
                    </div>

                    <h2 :title="itemName">{{ itemName }}</h2>

                    <div class="download-status" role="status" aria-live="polite">
                        <span class="status-dot" aria-hidden="true" />
                        {{ downloadedToken === token ? 'Download started' : 'Starting download...' }}
                    </div>

                    <p>
                        Your file will download automatically.<br>
                        If it hasn't started, use the button below.
                    </p>

                    <button
                        type="button"
                        class="download-btn"
                        :disabled="isDownloading"
                        :aria-busy="isDownloading"
                        @click="manualDownload"
                    >
                        <Icon
                            name="solar:download-linear"
                            size="1.2rem"
                        />

                        Download File
                    </button>
                </div>
            </div>

            <div
                v-else-if="sharedItem.type === 'note'"
                class="shared-content text-content"
            >
                {{ sharedItem.item.content }}
            </div>

            <div
                v-else-if="sharedItem.type === 'folder'"
                class="shared-content"
            >
                Folder
            </div>
        </template>
    </div>
</template>

<style scoped>
.shared-page {
    width: 100%;
    height: 100dvh;
    min-height: 0;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    background: #121214;
    color: #ffffff;
    box-sizing: border-box;
    overflow: hidden;
}

.shared-page *,
.shared-page *::before,
.shared-page *::after {
    box-sizing: border-box;
}

.shared-content {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    display: flex;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;
    overflow: hidden;
}

.media-content {
    align-items: center;
    justify-content: center;
    background: #0d0d10;
}

.image-content {
    background: transparent;
    border: 0;
}

.image-stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
}

.image-stage:fullscreen,
.image-stage.is-expanded {
    width: 100%;
    height: 100dvh;
    padding: clamp(0.5rem, 1.5vmin, 1rem);
    background: #121214;
    overflow: hidden;
}

.image-stage.is-expanded {
    position: fixed;
    inset: 0;
    z-index: 2000;
}

.image-fullscreen-btn {
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.6rem;
    height: 2.6rem;
    padding: 0;
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 0.45rem;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
}

.image-fullscreen-btn:hover {
    color: #ffffff;
    background: #29292e;
}

.image-fullscreen-btn:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 2px;
}

.image-preview,
.pdf-preview,
.video-preview {
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
}

.image-preview,
.video-preview {
    object-fit: contain;
    object-position: center;
}

.image-preview {
    border-radius: 1rem;
}

.pdf-preview {
    border: 0;
}

.text-content {
    display: block;
    padding: 1rem 1.2rem;
    overflow: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
}

.text-preview {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: monospace;
    font-size: 0.9rem;
    line-height: 1.7;
}

.video-preview {
    background: #000;
}

.download-message {
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1.5rem;
    text-align: center;
}

.download-icon {
    flex: 0 0 auto;
    width: 6.5rem;
    height: 6.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #30295f, #211d3b);
    border: 1px solid #42386f;
    color: #8b7cff;
    border-radius: 1.4rem;
}

.download-message h2 {
    flex-shrink: 0;
    display: -webkit-box;
    width: 100%;
    max-width: 34rem;
    margin: 0.25rem 0 0;
    color: #ffffff;
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
}

.download-status {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    color: #b5acff;
    background: #242039;
    border: 1px solid #37304f;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
}

.status-dot {
    flex: 0 0 auto;
    width: 0.4rem;
    height: 0.4rem;
    background: #8b7cff;
    border-radius: 50%;
    box-shadow: 0 0 0 3px #8b7cff1a;
}

.download-message p {
    flex-shrink: 0;
    max-width: 28rem;
    margin: 0;
    color: #898991;
    font-size: 0.85rem;
    line-height: 1.6;
}

.download-btn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    margin-top: 0.25rem;
    padding: 0.8rem 1.4rem;
    color: #ffffff;
    background: #3c47be;
    border: 1px solid #4f5bdf;
    border-radius: 0.6rem;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
}

.download-btn:hover:not(:disabled) {
    background: #505cf0;
    border-color: #6b75ff;
}

.download-btn:focus-visible {
    outline: 2px solid #b5acff;
    outline-offset: 4px;
}

.download-btn:disabled {
    opacity: 0.65;
    cursor: wait;
}

.shared-error {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.shared-error-card {
    width: 100%;
    max-width: 27rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: clamp(1.25rem, 4vw, 2.5rem);
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1.25rem;
    text-align: center;
}

.shared-error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5.5rem;
    height: 5.5rem;
    background: linear-gradient(145deg, #30295f, #211d3b);
    border: 1px solid #42386f;
    border-radius: 1.25rem;
    color: #a79aff;
}

.shared-error-code {
    padding: 0.35rem 0.75rem;
    color: #b5acff;
    background: #242039;
    border: 1px solid #37304f;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
}

.shared-error-card h1 {
    margin: 0;
    color: #ffffff;
    font-size: clamp(1.2rem, 3vw, 1.5rem);
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.shared-error-card p {
    max-width: 21rem;
    margin: 0;
    color: #898991;
    font-size: 0.85rem;
    line-height: 1.7;
}

.error-message {
    padding: 1rem;
    color: #ef6666;
    font-size: 0.9rem;
    min-height: 0;
    overflow: auto;
    overflow-wrap: anywhere;
}

@media (max-width: 600px) {
    .shared-page {
        padding: 0.6rem;
    }

    .download-message {
        padding: 1.25rem 1rem;
        gap: 0.85rem;
    }

    .download-icon {
        width: 5.5rem;
        height: 5.5rem;
    }
}

@media (max-height: 500px) {
    .shared-error {
        padding: 0;
    }

    .shared-error-card {
        gap: 0.6rem;
        padding: 1rem;
    }

    .shared-error-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 1rem;
    }

    .download-message {
        display: grid;
        grid-template-columns: 3.5rem minmax(0, 28rem);
        align-content: center;
        justify-items: start;
        gap: 0.4rem 1rem;
        padding: 0.75rem;
        text-align: left;
    }

    .download-icon {
        grid-column: 1;
        grid-row: 1 / span 4;
        align-self: center;
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 0.85rem;
    }

    .download-icon :deep(.iconify) {
        font-size: 2rem !important;
    }

    .download-message h2,
    .download-status,
    .download-message p,
    .download-btn {
        grid-column: 2;
    }

    .download-message h2 {
        margin: 0;
        font-size: 1.1rem;
    }

    .download-message p {
        font-size: 0.8rem;
        line-height: 1.5;
    }

    .download-btn {
        margin-top: 0;
        padding: 0.65rem 1.1rem;
    }
}
</style>
