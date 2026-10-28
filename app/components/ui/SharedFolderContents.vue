<template>
    <div class="shared-folder flex-1 min-h-0 min-w-0 flex flex-col">
        <div class="folder-heading flex items-center gap-3 min-w-0 flex-wrap justify-between p-5">
            <div class="folder-path flex items-center gap-3 min-w-0 flex-wrap">
                <button
                    v-if="history.length"
                    type="button"
                    class="folder-button py-2.5 px-3 text-content bg-control border border-control-border rounded-md text-sm
                    cursor-pointer no-underline hover:brightness-110 leading-[inherit]"
                    @click="goBack"
                >
                    Back
                </button>
                <Icon class="text-accent" name="solar:folder-bold" />
                <h1 class="m-0 text-[1.1rem] wrap-anywhere">{{ contents?.name ?? rootName }}</h1>
            </div>
            <a
                class="folder-button primary py-2.5 px-3 text-on-primary bg-primary border rounded-md text-sm cursor-pointer
                no-underline border-primary hover:brightness-110 leading-[inherit]"
                :href="resourceUrl('download', currentFolder)"
                >Download Folder</a
            >
        </div>
        <div
            v-if="error"
            class="folder-error p-5 text-muted"
        >
            Folder contents could not be loaded.
            <button
                type="button"
                class="folder-button py-2.5 px-3 text-content bg-control border border-control-border rounded-md text-sm
                cursor-pointer no-underline hover:brightness-110 leading-[inherit]"
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
        <Transition name="preview">
            <div
                v-if="selected"
                class="preview-overlay fixed inset-3 flex flex-col bg-canvas border border-divider rounded-xl z-1100
                overflow-hidden"
                @keydown.esc="selected = null"
                @click.self="selected = null"
            >
                <div class="preview-heading flex items-center gap-3 min-w-0 flex-wrap justify-between p-5">
                    <h2 class="m-0 text-[1.1rem] wrap-anywhere">{{ selected.name }}</h2>
                    <div class="folder-path flex items-center gap-3 min-w-0 flex-wrap">
                        <a
                            class="folder-button primary py-2.5 px-3 text-on-primary bg-primary border rounded-md text-sm cursor-pointer
                            no-underline border-primary hover:brightness-110 leading-[inherit]"
                            :href="resourceUrl('download', selected)"
                            >Download</a
                        >
                        <button
                            ref="closeButton"
                            type="button"
                            class="folder-button py-2.5 px-3 text-content bg-control border border-control-border rounded-md text-sm
                            cursor-pointer no-underline hover:brightness-110 leading-[inherit]"
                            @click="selected = null"
                        >
                            Close preview
                        </button>
                    </div>
                </div>
                <p
                    v-if="previewError"
                    class="folder-error p-5 text-muted"
                >
                    {{ previewError }}
                </p>
                <img class="flex-1 min-h-0 w-full object-contain border-0"
                    v-else-if="selected.mime_type?.startsWith('image/')"
                    :src="resourceUrl('preview', selected)"
                    :alt="selected.name"
                    @error="previewError = 'Preview could not be loaded.'"
                />
                <video class="flex-1 min-h-0 w-full object-contain border-0"
                    v-else-if="selected.mime_type?.startsWith('video/')"
                    :src="resourceUrl('preview', selected)"
                    controls
                    playsinline
                    preload="metadata"
                    @error="previewError = 'Preview could not be loaded.'"
                />
                <iframe class="flex-1 min-h-0 w-full object-contain border-0"
                    v-else-if="selected.mime_type === 'application/pdf'"
                    :src="resourceUrl('preview', selected)"
                    :title="selected.name"
                />
                <pre class="flex-1 min-h-0 w-full object-contain border-0 p-5 m-0 overflow-auto whitespace-pre-wrap wrap-anywhere" v-else-if="selected.type === 'note' || selected.mime_type?.startsWith('text/')">{{
                    loadingText ? 'Loading preview...' : textContent
                }}</pre>
                <p
                    v-else
                    class="folder-error p-5 text-muted"
                >
                    Preview is not available for this file type. Use Download to save it.
                </p>
            </div>
        </Transition>
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
