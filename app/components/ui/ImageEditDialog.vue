<script setup lang="ts">
import { cropPixels, editableImageType, fullImageCrop, rotatedImageSize, type ImageCrop } from '~/utils/imageEdit'
import { uploadResumably } from '~/utils/resumableUpload'

const props = defineProps<{ src: string; name: string; fileId: string; revision: number; mimeType: string | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const currentUser = useAuthUser()
const dialog = ref<HTMLDialogElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null), stage = ref<HTMLElement | null>(null)
const busy = ref(false), loading = ref(true), errorMessage = ref(''), progress = ref(0)
const turns = ref(0), cropping = ref(false), crop = ref<ImageCrop>(fullImageCrop())
const source = ref<HTMLImageElement | null>(null), surfaceSize = ref({ width: 1, height: 1 })
const changed = computed(() => turns.value !== 0 || (cropping.value && (crop.value.width < 0.9999 || crop.value.height < 0.9999)))
const headingId = useId()
let objectUrl = '', observer: ResizeObserver | null = null, controller = new AbortController()
let drag: { pointer: number; mode: string; x: number; y: number; crop: ImageCrop } | null = null
const outsidePressed = ref(false)
const close = () => { if (!busy.value) emit('close') }

const fitSurface = () => {
    if (!stage.value || !canvas.value) return
    const fit = Math.min(stage.value.clientWidth / canvas.value.width, stage.value.clientHeight / canvas.value.height)
    surfaceSize.value = { width: Math.max(1, canvas.value.width * fit), height: Math.max(1, canvas.value.height * fit) }
}
const draw = () => {
    if (!source.value || !canvas.value) return
    const size = rotatedImageSize(source.value.naturalWidth, source.value.naturalHeight, turns.value)
    canvas.value.width = size.width; canvas.value.height = size.height
    const context = canvas.value.getContext('2d')!
    context.translate(size.width / 2, size.height / 2)
    context.rotate(turns.value * Math.PI / 2)
    context.drawImage(source.value, -source.value.naturalWidth / 2, -source.value.naturalHeight / 2)
    fitSurface()
}
const rotate = (direction: number) => {
    turns.value = (turns.value + direction + 4) % 4
    crop.value = fullImageCrop()
    draw()
}
const squareCrop = () => {
    if (!canvas.value) return
    cropping.value = true
    const side = Math.min(canvas.value.width, canvas.value.height)
    crop.value = { x: (1 - side / canvas.value.width) / 2, y: (1 - side / canvas.value.height) / 2, width: side / canvas.value.width, height: side / canvas.value.height }
}
const startCrop = (event: PointerEvent, mode = 'draw') => {
    if (!cropping.value || busy.value || loading.value || event.button !== 0) return
    const area = (event.currentTarget as HTMLElement).closest('.image-edit-surface')!.getBoundingClientRect()
    drag = { pointer: event.pointerId, mode, x: (event.clientX - area.left) / area.width, y: (event.clientY - area.top) / area.height, crop: { ...crop.value } }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    event.preventDefault()
}
const moveCrop = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return
    const area = (event.currentTarget as HTMLElement).closest('.image-edit-surface')!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - area.left) / area.width)), y = Math.min(1, Math.max(0, (event.clientY - area.top) / area.height))
    const dx = x - drag.x, dy = y - drag.y, original = drag.crop
    if (drag.mode === 'move') {
        crop.value = { ...original, x: Math.min(1 - original.width, Math.max(0, original.x + dx)), y: Math.min(1 - original.height, Math.max(0, original.y + dy)) }
    } else {
        let left = original.x, top = original.y, right = left + original.width, bottom = top + original.height
        if (drag.mode === 'draw') { left = Math.min(drag.x, x); right = Math.max(drag.x, x); top = Math.min(drag.y, y); bottom = Math.max(drag.y, y) }
        else {
            if (drag.mode.includes('w')) left = Math.min(right - 0.02, Math.max(0, original.x + dx))
            if (drag.mode.includes('e')) right = Math.max(left + 0.02, Math.min(1, original.x + original.width + dx))
            if (drag.mode.includes('n')) top = Math.min(bottom - 0.02, Math.max(0, original.y + dy))
            if (drag.mode.includes('s')) bottom = Math.max(top + 0.02, Math.min(1, original.y + original.height + dy))
        }
        crop.value = { x: left, y: top, width: Math.min(1 - left, Math.max(0.02, right - left)), height: Math.min(1 - top, Math.max(0.02, bottom - top)) }
    }
}
const endCrop = (event: PointerEvent) => { if (drag?.pointer === event.pointerId) drag = null }
const save = async () => {
    if (busy.value || !changed.value || !canvas.value || !currentUser.value) return
    busy.value = true; errorMessage.value = ''; progress.value = 0
    try {
        const mime = editableImageType(props.name, props.mimeType)
        if (!mime) throw new Error('Editing supports JPG, PNG and WebP images.')
        const area = cropPixels(cropping.value ? crop.value : fullImageCrop(), canvas.value.width, canvas.value.height)
        const output = document.createElement('canvas')
        output.width = area.width; output.height = area.height
        output.getContext('2d')!.drawImage(canvas.value, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)
        const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('Could not export this image.')), mime, 0.95))
        if (blob.type !== mime) throw new Error('Your browser cannot save this image format.')
        await uploadResumably([new File([blob], props.name, { type: mime })], {
            kind: 'files', scope: currentUser.value.id, label: 'Edited image', replaceFileId: props.fileId, expectedRevision: props.revision,
            onProgress: (loaded, total) => { progress.value = total ? Math.floor(loaded / total * 100) : 0 }
        })
        emit('saved')
    } catch (error: any) { errorMessage.value = error.data?.message || error.message || 'Could not save image. Your edits are still here.' }
    finally { busy.value = false }
}
onMounted(async () => {
    dialog.value?.showModal()
    observer = new ResizeObserver(fitSurface)
    if (stage.value) observer.observe(stage.value)
    try {
        const response = await fetch(props.src, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error('Could not load this image.')
        objectUrl = URL.createObjectURL(await response.blob())
        const image = new Image(); image.src = objectUrl
        await image.decode()
        if (controller.signal.aborted) return
        source.value = image; draw()
    } catch (error: any) { if (!controller.signal.aborted) errorMessage.value = error.message || 'Could not load this image.' }
    finally { loading.value = false }
})
onBeforeUnmount(() => { controller.abort(); observer?.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); dialog.value?.close() })
</script>

<template>
    <Teleport to="body">
        <dialog ref="dialog" class="image-edit-dialog" :aria-labelledby="headingId" @cancel.prevent="close"
            @pointerdown="outsidePressed = $event.target === $event.currentTarget"
            @pointerup="outsidePressed = outsidePressed && $event.target === $event.currentTarget" @click.self="outsidePressed && close()">
            <header class="image-edit-header"><div class="min-w-0 flex-1"><h2 :id="headingId">Edit image</h2><p class="truncate">{{ name }}</p></div><button type="button" class="inbox-icon" :disabled="busy" aria-label="Close image editor" @click="close">×</button></header>
            <div class="image-edit-tools" role="group" aria-label="Image editing tools">
                <button type="button" class="inbox-button" :disabled="busy || loading" @click="rotate(-1)">↶ Rotate left</button>
                <button type="button" class="inbox-button" :disabled="busy || loading" @click="rotate(1)">↷ Rotate right</button>
                <button type="button" class="inbox-button" :aria-pressed="cropping" :disabled="busy || loading" @click="cropping = !cropping">Crop</button>
                <button type="button" class="inbox-button" :disabled="busy || loading" @click="squareCrop">Square</button>
                <button type="button" class="inbox-button" :disabled="busy || loading" @click="turns = 0; crop = fullImageCrop(); cropping = false; draw()">Reset</button>
            </div>
            <div ref="stage" class="image-edit-stage" :aria-busy="loading || busy">
                <span v-if="loading" role="status">Loading image…</span>
                <div v-show="!loading && source" class="image-edit-surface" :style="{ width: surfaceSize.width + 'px', height: surfaceSize.height + 'px' }"
                    @pointerdown="startCrop($event)" @pointermove="moveCrop" @pointerup="endCrop" @pointercancel="endCrop">
                    <canvas ref="canvas" aria-label="Image edit preview" />
                    <div v-if="cropping" class="image-crop-selection" :style="{ left: crop.x * 100 + '%', top: crop.y * 100 + '%', width: crop.width * 100 + '%', height: crop.height * 100 + '%' }"
                        @pointerdown.stop="startCrop($event, 'move')">
                        <span v-for="corner in ['nw', 'ne', 'sw', 'se']" :key="corner" :class="['image-crop-handle', corner]" @pointerdown.stop="startCrop($event, corner)" />
                    </div>
                </div>
            </div>
            <footer class="image-edit-footer">
                <p class="text-xs text-muted">{{ cropping ? 'Drag the selection or its corners to crop. ' : '' }}The original stays in version history.</p>
                <p v-if="errorMessage" role="alert" class="text-sm text-danger">{{ errorMessage }}</p>
                <progress v-if="busy" :value="progress" max="100" class="w-full" />
                <div class="flex justify-end gap-2"><button type="button" class="inbox-button" :disabled="busy" @click="close">Cancel</button><button type="button" class="inbox-button bg-primary! text-on-primary!" :disabled="busy || loading || !changed" @click="save">{{ busy ? 'Saving…' : 'Save image' }}</button></div>
            </footer>
        </dialog>
    </Teleport>
</template>

<style scoped>
.image-edit-dialog { width: min(64rem, calc(100vw - 2rem)); height: min(50rem, calc(100dvh - 2rem)); max-width: none; max-height: none; margin: auto; padding: 0; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); overflow: hidden; }
.image-edit-dialog[open] { display: flex; flex-direction: column; }
.image-edit-dialog::backdrop { background: #000b; }
.image-edit-header { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--color-divider); }
.image-edit-header h2 { margin: 0; font-size: 1rem; font-weight: 600; }
.image-edit-header p { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--color-muted); }
.image-edit-tools { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem; }
.image-edit-tools [aria-pressed=true] { border-color: var(--color-accent); color: var(--color-accent); }
.image-edit-stage { flex: 1; min-height: 0; min-width: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--color-canvas); }
.image-edit-surface { position: relative; flex: none; overflow: hidden; touch-action: none; user-select: none; }
.image-edit-surface canvas { width: 100%; height: 100%; display: block; }
.image-crop-selection { position: absolute; box-sizing: border-box; border: 2px solid white; box-shadow: 0 0 0 200vmax #0008; cursor: move; }
.image-crop-selection::after { content: ''; position: absolute; inset: 33.333%; border: 1px solid #ffffff80; pointer-events: none; }
.image-crop-handle { position: absolute; width: 2rem; height: 2rem; z-index: 1; }
.image-crop-handle::after { content: ''; position: absolute; inset: 0.5rem; background: white; border: 1px solid #222; border-radius: 50%; }
.image-crop-handle.nw { left: -1rem; top: -1rem; cursor: nwse-resize; }
.image-crop-handle.ne { right: -1rem; top: -1rem; cursor: nesw-resize; }
.image-crop-handle.sw { left: -1rem; bottom: -1rem; cursor: nesw-resize; }
.image-crop-handle.se { right: -1rem; bottom: -1rem; cursor: nwse-resize; }
.image-edit-footer { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem 1rem; border-top: 1px solid var(--color-divider); max-height: 40dvh; overflow: auto; }
@media(max-width: 600px) { .image-edit-dialog { width: 100%; height: 100dvh; margin: 0; border: 0; border-radius: 0; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); } .image-edit-tools button { min-height: 2.75rem; } }
</style>
