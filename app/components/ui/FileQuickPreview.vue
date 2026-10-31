<template>
    <Teleport to="body">
        <dialog ref="dialog" class="quick-preview-dialog" aria-labelledby="quick-preview-title" @cancel.prevent="emit('close')" @close="emit('close')" @pointerdown="outsideStart = outside($event)" @click.self="outsideStart && outside($event) && emit('close')">
            <header class="flex shrink-0 items-center gap-3 border-b border-divider p-4">
                <div class="min-w-0 flex-1"><h2 id="quick-preview-title" class="truncate font-semibold" :title="item?.name">{{ item?.name }}</h2><p class="mt-1 text-xs text-muted">{{ item?.size ? formatFileSize(item.size) : '' }} · Quick preview · Esc to close</p></div>
                <a v-if="item" :href="downloadUrl" class="inbox-button" download aria-label="Download file"><Icon name="solar:download-linear" /></a>
                <button ref="closeButton" type="button" class="inbox-icon" aria-label="Close preview" @click="emit('close')"><Icon name="solar:close-circle-linear" size="25" /></button>
            </header>
            <section class="relative min-h-0 flex-1 overflow-auto bg-canvas p-4" :aria-busy="loading">
                <p v-if="loading" role="status" class="text-center text-sm text-muted">Loading preview…</p>
                <div v-if="errorMessage" role="alert" class="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><p class="text-sm text-label">{{ errorMessage }}</p><button type="button" class="inbox-button" @click="load">Try again</button></div>
                <template v-else>
                    <img v-if="kind === 'image'" :key="previewUrl" :src="previewUrl" :alt="item?.name" class="mx-auto max-h-full max-w-full rounded-lg object-contain" @load="loading = false" @error="failed">
                    <pre v-else-if="kind === 'text' && !loading" class="m-0 whitespace-pre-wrap wrap-anywhere font-mono text-sm leading-7 text-content">{{ text }}</pre>
                    <iframe v-else-if="kind === 'pdf'" :key="previewUrl" :src="previewUrl" title="PDF preview" class="h-full min-h-80 w-full rounded-lg border-0 bg-white" referrerpolicy="no-referrer" @load="loading = false" />
                    <video v-else-if="kind === 'video'" :key="previewUrl" :src="previewUrl" controls playsinline preload="metadata" class="mx-auto max-h-full w-full rounded-lg bg-black" @loadedmetadata="loading = false" @error="failed" />
                    <audio v-else-if="kind === 'audio'" :key="previewUrl" :src="previewUrl" controls preload="metadata" class="mx-auto mt-12 w-full max-w-lg" @loadedmetadata="loading = false" @error="failed" />
                    <p v-else-if="kind === 'unsupported'" class="py-16 text-center text-sm text-muted">Preview is not available for this file type. Use Download to open it.</p>
                </template>
                <p v-if="truncated && !loading" class="mt-4 text-xs text-muted">Showing the first 1 MB. Download to read the rest.</p>
            </section>
        </dialog>
    </Teleport>
</template>
<script setup lang="ts">
import type { QuickPreviewItem } from '~~/shared/types/quickPreview'
import { getInboxPreview } from '~~/shared/utils/inboxPreview'
import { formatFileSize } from '~/utils/file'
const props = defineProps<{ item: QuickPreviewItem | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null), closeButton = ref<HTMLButtonElement | null>(null)
const text = ref(''), errorMessage = ref(''), loading = ref(false), truncated = ref(false)
const kind = computed(() => props.item?.type === 'note' ? 'text' : getInboxPreview(props.item?.name ?? '', props.item?.mime_type ?? null).kind)
const base = computed(() => props.item ? `/api/${props.item.type === 'note' ? 'notes' : 'files'}/${encodeURIComponent(props.item.resourceId ?? props.item.id)}` : '')
const previewUrl = computed(() => `${base.value}/preview`), downloadUrl = computed(() => `${base.value}/download`)
let controller: AbortController | null = null, generation = 0, outsideStart = false
const outside = (event: MouseEvent) => {
    const r = dialog.value?.getBoundingClientRect()
    return event.target === dialog.value && !!r && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
}
const failed = () => { loading.value = false; errorMessage.value = 'Could not load the preview. The file may have been removed or the format may not be supported.' }
const load = async () => {
    const current = ++generation
    controller?.abort(); controller = null; text.value = ''; errorMessage.value = ''; truncated.value = false; outsideStart = false
    if (!props.item) { dialog.value?.close(); return }
    loading.value = kind.value !== 'unsupported'
    await nextTick()
    if (current !== generation || !dialog.value?.isConnected) return
    if (!dialog.value.open) dialog.value.showModal()
    closeButton.value?.focus({ preventScroll: true })
    if (kind.value !== 'text') return
    controller = new AbortController()
    try {
        if (props.item.type === 'note') {
            const note = await $fetch<{ content: string }>(base.value, { signal: controller.signal })
            if (current === generation) { text.value = note.content.slice(0, 1048576); truncated.value = note.content.length > 1048576 }
        } else {
            const response = await $fetch.raw<string>(previewUrl.value, { responseType: 'text', signal: controller.signal })
            if (current === generation) { text.value = response._data ?? ''; truncated.value = response.headers.get('X-Preview-Truncated') === 'true' }
        }
    } catch { if (current === generation) failed() }
    finally { if (current === generation) loading.value = false }
}
watch(() => props.item, load, { flush: 'post' })
onBeforeUnmount(() => { generation++; controller?.abort(); dialog.value?.close() })
</script>
<style scoped>
.quick-preview-dialog { margin: auto; width: min(68rem, calc(100% - 2rem)); height: min(52rem, calc(100dvh - 2rem)); max-width: none; max-height: calc(100dvh - 2rem); padding: 0; overflow: hidden; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); }
.quick-preview-dialog[open] { display: flex; flex-direction: column; }
.quick-preview-dialog::backdrop { background: #000a; }
</style>
