<template>
    <div ref="scope" @focusin="activate" @pointerdown="activate">
        <slot />
        <FileQuickPreview :item="preview" @close="close" />
    </div>
</template>
<script setup lang="ts">
import type { QuickPreviewItem } from '~~/shared/types/quickPreview'
import { canQuickPreview } from '~/utils/quickPreview'
const props = defineProps<{ items: QuickPreviewItem[]; selectedIds?: string[] }>()
const scope = ref<HTMLElement | null>(null), preview = ref<QuickPreviewItem | null>(null)
let activeId = '', previousFocus: HTMLElement | null = null
const activate = (event: Event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-preview-id]')
    if (row) activeId = row.dataset.previewId ?? ''
}
const close = () => {
    preview.value = null
    nextTick(() => previousFocus?.isConnected && previousFocus.focus({ preventScroll: true }))
}
const keydown = (event: KeyboardEvent) => {
    if (!canQuickPreview(event) || document.querySelector('dialog[open]')) return
    const selected = props.selectedIds ?? []
    const focusedRow = scope.value?.contains(event.target as Node) ? (event.target as HTMLElement).closest<HTMLElement>('[data-preview-id]') : null
    const id = focusedRow?.dataset.previewId || (selected.length === 1 ? selected[0] : activeId)
    const item = props.items.find(item => item.id === id && item.type !== 'folder')
    if (!item || !scope.value?.getClientRects().length) return
    event.preventDefault()
    previousFocus = document.activeElement as HTMLElement | null
    preview.value = item
}
onMounted(() => window.addEventListener('keydown', keydown))
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
watch(() => props.items, items => { if (preview.value && !items.some(item => item.id === preview.value?.id)) close() })
</script>
