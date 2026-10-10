<script setup lang="ts">
definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

import { getFileIcon, getFileType, getFileCategory,formatFileSize, formatFileTime} from "~/utils/file"

const route = useRoute()

const fileId = route.params.id as string

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

const { data: file } = await useFetch<FileData>(`/api/files/${fileId}`)

const isImage = computed(() => {
    return file.value?.mime_type?.startsWith('image/')
})

const isText = computed(() => {
    return file.value?.mime_type?.startsWith('text/')
})


const isPdf = computed(() => {
    return file.value?.mime_type === 'application/pdf'
})

const isPreviewable = computed(() => {
    return isImage.value || isText.value || isPdf.value
})

const textContent = ref('')

if (isText.value) {
    textContent.value = await $fetch<string>(
        `/api/files/preview?fileId=${fileId}`
    )
}

const getImageDimensions = (src: string) => {
    return new Promise<{ width: number, height: number}>((resolve, reject) => {
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

const imageDimensions = ref<{
    width: number,
    height: number
} | null>(null)

onMounted(async () => {
    if (!isImage.value || !file.value) return

    imageDimensions.value = await getImageDimensions(
        `/api/files/preview?fileId=${file.value.id}`
    )
})

</script>

<template>
    <div class="file-page">
        <DetailsView :previewable="isPreviewable">
            <template #preview>
                <div class="preview-card">
                    <div class="preview-header">
                        {{ file?.name }}
                    </div>

                    <div class="preview-content">
                        <img 
                            v-if="isImage"
                            :src="`/api/files/preview?fileId=${file?.id}`"
                            :alt="file?.name"
                        >

                        <pre v-else-if="isText">{{ textContent }}</pre>

                        <iframe 
                            v-else-if="isPdf"
                            :src="`/api/files/preview?fileId=${fileId}`"
                        />
                    </div>
                </div>
            </template>

            <template #details>
                <DetailsPanel
                    :item-id="fileId"
                    item-type="file"
                    :actions="[
                        'download',
                        'rename',
                        'favorite',
                        'delete'
                    ]"
                >
                    <template #info>
                        <div class="info-row">
                            <span class="info-label">
                                Name
                            </span>

                            <span class="info-value">
                                {{ file?.name }}
                            </span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">
                                Type
                            </span>

                            <span class="info-value">
                                {{ getFileType(file?.original_name ?? '') }}
                            </span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">
                                Size
                            </span>

                            <span class="info-value">
                                {{ formatFileSize(file?.size ?? 0) }}
                            </span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">
                                Created
                            </span>

                            <span class="info-value">
                                {{ formatFileTime(file?.created_at ?? '') }}
                            </span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">
                                Modified
                            </span>

                            <span class="info-value">
                                {{ formatFileTime(file?.updated_at ?? '') }}
                            </span>
                        </div>

                        <div
                            v-if="isImage"
                            class="info-row"
                        >
                            <span class="info-label">
                                Dimensions
                            </span>

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
    </div>
</template>

<style scoped>
.file-page {
    width: 100%;
    height: 100%;
}

.preview-card {
    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 0.75rem;
}

.preview-card {
    height: 100%;
    min-height: 36rem;

    display: flex;
    flex-direction: column;
}

.preview-header {
    padding: 1rem 1.2rem;

    color: #ffffff;

    border-bottom: 1px solid #29292e;

    font-size: 0.95rem;
    font-weight: 600;
}

.preview-content {
    flex: 1;

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
    height: 100%;

    margin: 0;

    color: #d5d5da;

    white-space: pre-wrap;
    word-break: break-word;

    font-family: monospace;
    font-size: 0.85rem;
}

.preview-content iframe {
    width: 100%;
    height: 32rem;

    border: none;
    border-radius: 0.6rem;
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
    color: #898991;

    font-size: 0.8rem;
}

.info-value {
    max-width: 65%;

    color: #d5d5da;

    font-size: 0.8rem;

    text-align: right;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

</style>