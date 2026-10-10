
<script setup lang="ts">
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
        <div v-if="error" class="error-message">
            {{
                error.statusCode === 404
                    ? 'Shared item not found.'
                    : 'An error occurred while loading the shared item.'
            }}
        </div>

        <template v-else-if="sharedItem">
            <div class="header-bar">
                <div>
                    <h1>{{ itemName }}</h1>

                    <span class="shared-by">
                        Shared by {{ sharedItem.sharedBy }}
                    </span>
                </div>
            </div>

            <div
                v-if="sharedItem.type === 'file'"
                class="shared-content"
            >
                <img
                    v-if="isImage"
                    class="image-preview"
                    :src="`/api/shared/${token}/preview`"
                    :alt="sharedItem.item.name"
                >

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
                />

                <video
                    v-else-if="isVideo"
                    class="video-preview"
                    :src="`/api/shared/${token}/preview`"
                    controls
                    preload="metadata"
                />

                <div v-else class="download-message">
                    <div class="download-icon">
                        <Icon
                            name="solar:download-bold"
                            size="2.5rem"
                        />
                    </div>

                    <h2>Downloading file...</h2>

                    <p>
                        Your download should start automatically.
                    </p>

                    <button
                        class="download-btn"
                        @click="manualDownload"
                    >
                        <Icon
                            name="solar:download-linear"
                            size="1.2rem"
                        />

                        Download manually
                    </button>
                </div>
            </div>

            <div
                v-else-if="sharedItem.type === 'note'"
                class="shared-content"
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
    min-height: 100dvh;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #121214;
    color: #ffffff;
    box-sizing: border-box;
}

.header-bar {
    width: 100%;
    padding: 1rem 1.2rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;
    box-sizing: border-box;
}

.header-bar h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
}

.shared-by {
    display: block;
    margin-top: 0.3rem;
    color: #898991;
    font-size: 0.8rem;
}

.shared-content {
    flex: 1;
    min-height: 0;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;
    padding: 1rem;
    box-sizing: border-box;
}

.image-preview {
    width: 100%;
    height: 100%;
    max-height: calc(100dvh - 7rem);
    object-fit: contain;
}

.pdf-preview {
    width: 100%;
    height: calc(100dvh - 7rem);
    border: 0;
    border-radius: 0.6rem;
}

.text-preview {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: monospace;
}

.video-preview {
    width: 100%;
    max-height: calc(100dvh - 7rem);
    object-fit: contain;
    border-radius: 0.6rem;
    background: #000;
}

.download-message {
    min-height: 26rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    text-align: center;
}

.download-icon {
    width: 6rem;
    height: 6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #282354;
    color: #8b7cff;
    border-radius: 1.2rem;
}

.download-message h2 {
    margin: 0.5rem 0 0;
    color: #ffffff;
    font-size: 1.3rem;
    font-weight: 600;
}

.download-message p {
    margin: 0;
    color: #898991;
    font-size: 0.85rem;
    line-height: 1.6;
}

.download-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    margin-top: 0.75rem;
    padding: 0.8rem 1.4rem;
    color: #ffffff;
    background: #3c47be;
    border: 1px solid #4f5bdf;
    border-radius: 0.6rem;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
}

.download-btn:hover {
    background: #505cf0;
}

.error-message {
    padding: 1rem;
    color: #ef6666;
    font-size: 0.9rem;
}

@media (max-width: 600px) {
    .shared-page {
        padding: 0.4rem;
    }

    .header-bar {
        padding: 1rem;
    }

    .download-message {
        min-height: 20rem;
        padding: 1rem;
    }

    .download-message h2 {
        font-size: 1.1rem;
    }
}
</style>
