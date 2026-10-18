<template>
    <div class="shared-folder">
        <div class="folder-heading">
            <div class="folder-path">
                <button
                    v-if="history.length"
                    type="button"
                    class="folder-button"
                    @click="goBack"
                >
                    Back
                </button>
                <Icon name="solar:folder-bold" />
                <h1>{{ contents?.name ?? rootName }}</h1>
            </div>
            <a
                class="folder-button primary"
                :href="resourceUrl('download', currentFolder)"
                >Download Folder</a
            >
        </div>
        <div
            v-if="error"
            class="folder-error"
            role="alert"
        >
            Folder contents could not be loaded.
            <button
                type="button"
                class="folder-button"
                @click="refresh()"
            >
                Try again
            </button>
        </div>
        <FolderBrowser
            v-else
            :key="currentId"
            :items="contents?.items ?? []"
            :pending="pending"
            :preview-url="item => resourceUrl('preview', item)"
            read-only
            @open="openItem"
        />
        <div
            v-if="selected"
            class="preview-overlay"
            role="dialog"
            aria-modal="true"
            :aria-label="selected.name"
            @keydown.esc="selected = null"
            @click.self="selected = null"
        >
            <div class="preview-heading">
                <h2>{{ selected.name }}</h2>
                <div class="folder-path">
                    <a
                        class="folder-button primary"
                        :href="resourceUrl('download', selected)"
                        >Download</a
                    >
                    <button
                        ref="closeButton"
                        type="button"
                        class="folder-button"
                        @click="selected = null"
                    >
                        Close preview
                    </button>
                </div>
            </div>
            <p
                v-if="previewError"
                class="folder-error"
                role="alert"
            >
                {{ previewError }}
            </p>
            <img
                v-else-if="selected.mime_type?.startsWith('image/')"
                :src="resourceUrl('preview', selected)"
                :alt="selected.name"
                @error="previewError = 'Preview could not be loaded.'"
            />
            <video
                v-else-if="selected.mime_type?.startsWith('video/')"
                :src="resourceUrl('preview', selected)"
                controls
                playsinline
                preload="metadata"
                @error="previewError = 'Preview could not be loaded.'"
            />
            <iframe
                v-else-if="selected.mime_type === 'application/pdf'"
                :src="resourceUrl('preview', selected)"
                :title="selected.name"
            />
            <pre v-else-if="selected.type === 'note' || selected.mime_type?.startsWith('text/')">{{
                loadingText ? 'Loading preview...' : textContent
            }}</pre>
            <p
                v-else
                class="folder-error"
            >
                Preview is not available for this file type. Use Download to save it.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { LibraryItem } from '~~/shared/types/library'

const props = defineProps<{ token: string; rootId: string; rootName: string }>()
const emit = defineEmits<{ accessError: [] }>()
const currentId = ref(props.rootId)
const history = ref<string[]>([])
const currentFolder = computed<LibraryItem>(() => ({
    id: currentId.value,
    type: 'folder',
    name: contents.value?.name ?? props.rootName,
    size: '0',
    created_at: null,
    updated_at: null
}))

const resourceUrl = (
    action: 'contents' | 'preview' | 'download',
    item: Pick<LibraryItem, 'id' | 'type'>
) =>
    `/api/shared/${encodeURIComponent(props.token)}/${action}?itemId=${encodeURIComponent(item.id)}&itemType=${item.type}`

const contentsUrl = computed(() => resourceUrl('contents', { id: currentId.value, type: 'folder' }))
const {
    data: contents,
    pending,
    error,
    refresh
} = await useFetch<{ id: string; name: string; items: LibraryItem[] }>(contentsUrl)
const selected = ref<LibraryItem | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const previewError = ref('')
const textContent = ref('')
const loadingText = ref(false)

watch(error, value => {
    if (value && [401, 403, 404, 410].includes(value.statusCode ?? 0)) emit('accessError')
})

const goBack = () => {
    const previous = history.value.pop()
    if (previous) currentId.value = previous
}

const openItem = async (item: LibraryItem) => {
    if (item.type === 'folder') {
        history.value.push(currentId.value)
        currentId.value = item.id
        return
    }

    selected.value = item
    previewError.value = ''
    textContent.value = ''
    loadingText.value = false
    await nextTick()
    closeButton.value?.focus()

    if (item.type === 'note' || item.mime_type?.startsWith('text/')) {
        loadingText.value = true
        try {
            const text = await $fetch<string>(resourceUrl('preview', item), {
                responseType: 'text'
            })
            if (selected.value?.id === item.id) textContent.value = text
        } catch (failure: any) {
            if (selected.value?.id === item.id) previewError.value = 'Preview could not be loaded.'
            if ([401, 403, 410].includes(failure.statusCode)) emit('accessError')
        } finally {
            if (selected.value?.id === item.id) loadingText.value = false
        }
    }
}
</script>

<style scoped>
.shared-folder {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.folder-heading,
.preview-heading,
.folder-path {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex-wrap: wrap;
}

.folder-heading,
.preview-heading {
    justify-content: space-between;
    padding: 1.25rem;
}

h1,
h2 {
    margin: 0;
    font-size: 1.1rem;
    overflow-wrap: anywhere;
}

.folder-path :deep(.iconify) {
    color: #8b7cff;
}

.folder-button {
    padding: 0.625rem 0.75rem;
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 6px;
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
}

.folder-button.primary {
    background: #3c47be;
    border-color: #3c47be;
    color: #ffffff;
}

.folder-button:hover {
    filter: brightness(1.1);
}

.folder-error {
    padding: 1.25rem;
    color: #898991;
}

.preview-overlay {
    position: fixed;
    inset: 0.75rem;
    display: flex;
    flex-direction: column;
    background: #121214;
    border: 1px solid #29292e;
    border-radius: 12px;
    z-index: 1100;
    overflow: hidden;
}

.preview-overlay img,
.preview-overlay video,
.preview-overlay iframe,
.preview-overlay pre {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: contain;
    border: 0;
}

.preview-overlay pre {
    padding: 1.25rem;
    margin: 0;
    overflow: auto;
    box-sizing: border-box;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
</style>
