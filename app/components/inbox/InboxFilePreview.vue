<template>
    <Teleport to="body">
        <dialog ref="dialog" aria-labelledby="inbox-preview-title" class="inbox-preview-dialog" @cancel.prevent="emit('close')" @close="emit('close')" @click.self="emit('close')">
            <header class="flex shrink-0 flex-wrap items-center gap-3 border-b border-divider p-4">
                <Icon name="solar:document-linear" size="25" class="shrink-0 text-accent" />
                <div class="min-w-0 flex-1"><h2 id="inbox-preview-title" class="truncate text-base font-semibold text-foreground" :title="upload?.name">{{ upload?.name }}</h2><p class="mt-1 text-xs text-muted">{{ upload ? formatFileSize(upload.size) : '' }} · Pending approval</p></div>
                <a v-if="upload" :href="downloadUrl" class="inbox-button" download><Icon name="solar:download-linear" /><span class="max-mobile:sr-only">Download</span></a>
                <button ref="closeButton" type="button" class="inbox-icon" aria-label="Close preview" @click="emit('close')"><Icon name="solar:close-circle-linear" size="25" /></button>
            </header>
            <section class="preview-content relative min-h-0 flex-1 overflow-auto bg-canvas p-4" :aria-busy="loading">
                <aside v-if="upload?.senderName || upload?.senderNote" class="mb-4 rounded-lg border border-divider bg-surface p-3 text-sm"><p class="text-muted">From {{ upload.senderName || 'Anonymous sender' }} <span class="text-xs">(self-reported)</span></p><p v-if="upload.senderNote" class="mt-2 whitespace-pre-wrap wrap-anywhere text-content">{{ upload.senderNote }}</p></aside>
                <p v-if="loading" role="status" class="absolute inset-x-4 top-4 z-10 rounded-lg bg-surface/90 p-3 text-center text-sm text-muted">Loading preview…</p>
                <div v-if="errorMessage" role="alert" class="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><Icon name="solar:danger-triangle-linear" size="34" class="text-muted" /><p class="max-w-96 text-sm leading-6 text-label">{{ errorMessage }}</p><button type="button" class="inbox-button" @click="openPreview">Try again</button></div>
                <template v-else>
                    <img v-if="kind === 'image'" :key="previewUrl" :src="previewUrl" :alt="upload?.name" class="mx-auto max-h-full max-w-full rounded-lg object-contain" @load="loading = false" @error="mediaFailed">
                    <pre v-else-if="kind === 'text' && !loading" class="m-0 whitespace-pre-wrap wrap-anywhere font-mono text-sm leading-7 text-content">{{ text }}</pre>
                    <iframe v-else-if="kind === 'pdf'" :key="previewUrl" :src="previewUrl" title="PDF preview" class="h-full min-h-80 w-full rounded-lg border-0 bg-white" referrerpolicy="no-referrer" @load="loading = false" />
                    <video v-else-if="kind === 'video'" :key="previewUrl" :src="previewUrl" controls playsinline preload="metadata" class="mx-auto h-full max-h-full w-full rounded-lg bg-black" @loadedmetadata="loading = false" @error="mediaFailed" />
                    <div v-else-if="kind === 'audio'" class="flex min-h-64 flex-col items-center justify-center gap-6"><Icon name="solar:music-note-linear" size="52" class="text-accent" /><audio :key="previewUrl" :src="previewUrl" controls preload="metadata" class="w-full max-w-lg" @loadedmetadata="loading = false" @error="mediaFailed" /></div>
                    <div v-else-if="kind === 'unsupported'" class="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><Icon name="solar:document-linear" size="40" class="text-muted" /><p class="max-w-96 text-sm leading-6 text-label">Preview is not available for this file type. You can download it to review it.</p></div>
                </template>
                <p v-if="truncated && !loading && !errorMessage" class="mt-4 border-t border-divider pt-3 text-xs text-muted">Showing the first 1 MB. Download the file to read the rest.</p>
            </section>
            <footer class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-divider p-4"><p class="text-xs text-muted">This file has not been saved to Files.</p><div class="flex gap-2"><button class="inbox-button text-danger!" type="button" @click="review('reject')">Reject</button><button class="inbox-button inbox-primary" type="button" @click="review('approve')">Approve</button></div></footer>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import type { ReceivedFile } from '~~/shared/types/inbox'
import { getInboxPreview } from '~~/shared/utils/inboxPreview'
import { formatFileSize } from '~/utils/file'

const props = defineProps<{ requestId: string; upload: ReceivedFile | null }>()
const emit = defineEmits<{ close: []; approve: [file: ReceivedFile]; reject: [file: ReceivedFile] }>()
const dialog = ref<HTMLDialogElement | null>(null), closeButton = ref<HTMLButtonElement | null>(null)
const loading = ref(false), text = ref(''), errorMessage = ref(''), truncated = ref(false)
const kind = computed(() => props.upload ? getInboxPreview(props.upload.name, props.upload.mimeType).kind : 'unsupported')
const previewUrl = computed(() => props.upload ? `/api/inbox/${encodeURIComponent(props.requestId)}/uploads/${encodeURIComponent(props.upload.id)}/preview` : '')
const downloadUrl = computed(() => props.upload ? `/api/inbox/${encodeURIComponent(props.requestId)}/uploads/${encodeURIComponent(props.upload.id)}/download` : '')
let controller: AbortController | null = null, generation = 0

const mediaFailed = () => { loading.value = false; errorMessage.value = 'This preview could not be loaded. The file may have been reviewed or removed, or the format may not be supported by your browser.' }
const openPreview = async () => {
    const upload = props.upload, current = ++generation
    controller?.abort(); controller = null
    text.value = ''; errorMessage.value = ''; truncated.value = false
    loading.value = !!upload && kind.value !== 'unsupported'
    if (!upload) { dialog.value?.close(); return }
    await nextTick()
    if (current !== generation || !dialog.value?.isConnected) return
    if (!dialog.value.open) dialog.value.showModal()
    closeButton.value?.focus({ preventScroll: true })
    if (kind.value !== 'text') return
    controller = new AbortController()
    try {
        const response = await $fetch.raw<string>(previewUrl.value, { responseType: 'text', signal: controller.signal })
        if (current !== generation) return
        text.value = response._data ?? ''; truncated.value = response.headers.get('X-Preview-Truncated') === 'true'
    } catch (error: any) {
        if (current !== generation) return
        errorMessage.value = error.data?.message || 'Could not load this file preview. Please try again.'
    } finally { if (current === generation) loading.value = false }
}
const review = async (action: 'approve' | 'reject') => {
    const file = props.upload
    if (!file) return
    emit('close')
    await nextTick()
    if (action === 'approve') emit('approve', file)
    else emit('reject', file)
}
watch(() => props.upload, openPreview, { flush: 'post' })
onBeforeUnmount(() => { generation++; controller?.abort(); dialog.value?.close() })
</script>

<style scoped>
.inbox-preview-dialog { margin: auto; width: min(68rem, calc(100% - 2rem)); height: min(52rem, calc(100dvh - 2rem)); max-width: none; max-height: calc(100dvh - 2rem); padding: 0; overflow: hidden; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); }
.inbox-preview-dialog[open] { display: flex; flex-direction: column; }
.inbox-preview-dialog::backdrop { background: #000a; }
.preview-content:has(> img) { display: flex; flex-direction: column; align-items: center; justify-content: center; }
@media (max-width: 480px) { .inbox-preview-dialog { width: calc(100% - 1rem); height: calc(100dvh - 1rem); max-height: calc(100dvh - 1rem); } }
</style>
