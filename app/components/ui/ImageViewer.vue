<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { limitImageTransform, pinchImage, zoomImageAt, type ImagePoint, type ImageTransform } from '~/utils/imageZoom'

const props = defineProps<{ src: string; alt: string }>()
const emit = defineEmits<{ load: [event: Event]; error: [event: Event] }>()
const viewport = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const mounted = ref(false)
const touchScreen = useMediaQuery('(max-width: 1100px), (pointer: coarse)')
const interactive = computed(() => mounted.value && touchScreen.value)
const transform = ref<ImageTransform>({ scale: 1, x: 0, y: 0 })
const bounds = ref({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 })
const pointers = new Map<number, ImagePoint>()
let startPoints: ImagePoint[] = []
let startTransform: ImageTransform = { scale: 1, x: 0, y: 0 }
let tap: { point: ImagePoint; time: number } | null = null
let lastTap: { point: ImagePoint; time: number } | null = null
let observer: ResizeObserver | null = null

const reset = () => {
    transform.value = { scale: 1, x: 0, y: 0 }
    pointers.clear()
    startPoints = []
    tap = lastTap = null
}
const measure = () => {
    const area = viewport.value, element = image.value
    if (!area || !element?.naturalWidth || !element.naturalHeight) return
    const fit = Math.min(area.clientWidth / element.naturalWidth, area.clientHeight / element.naturalHeight)
    bounds.value = { width: area.clientWidth, height: area.clientHeight, imageWidth: element.naturalWidth * fit, imageHeight: element.naturalHeight * fit }
    transform.value = limitImageTransform(transform.value, bounds.value)
}
const point = (event: PointerEvent): ImagePoint => {
    const rect = viewport.value!.getBoundingClientRect()
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
}
const rebase = () => {
    startPoints = [...pointers.values()].map(value => ({ ...value }))
    startTransform = { ...transform.value }
}
const pointerDown = (event: PointerEvent) => {
    if (!interactive.value || event.button !== 0) return
    viewport.value?.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, point(event))
    if (pointers.size > 1) lastTap = null
    tap = pointers.size === 1 ? { point: point(event), time: Date.now() } : null
    rebase()
}
const pointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    const current = point(event)
    pointers.set(event.pointerId, current)
    if (tap && Math.hypot(current.x - tap.point.x, current.y - tap.point.y) > 8) tap = null
    const values = [...pointers.values()]
    if (values.length >= 2 && startPoints.length >= 2) {
        transform.value = pinchImage(startTransform, [startPoints[0]!, startPoints[1]!], [values[0]!, values[1]!], bounds.value)
    } else if (values.length === 1 && startPoints[0]) {
        transform.value = limitImageTransform({ scale: startTransform.scale, x: startTransform.x + current.x - startPoints[0].x, y: startTransform.y + current.y - startPoints[0].y }, bounds.value)
    }
}
const pointerEnd = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    if (event.type === 'pointerup' && pointers.size === 1 && tap && Date.now() - tap.time < 300) {
        if (lastTap && Date.now() - lastTap.time < 320 && Math.hypot(tap.point.x - lastTap.point.x, tap.point.y - lastTap.point.y) < 24) {
            transform.value = zoomImageAt(transform.value, transform.value.scale > 1 ? 1 : 2.5, tap.point, bounds.value)
            lastTap = null
        } else lastTap = tap
    }
    tap = null
    pointers.delete(event.pointerId)
    if (viewport.value?.hasPointerCapture(event.pointerId)) viewport.value.releasePointerCapture(event.pointerId)
    rebase()
}
const changeZoom = (amount: number) => {
    transform.value = zoomImageAt(transform.value, transform.value.scale + amount, { x: 0, y: 0 }, bounds.value)
}
const loaded = (event: Event) => { measure(); emit('load', event) }
watch(() => props.src, reset)
watch(interactive, enabled => { if (!enabled) reset() })
onMounted(() => {
    mounted.value = true
    observer = new ResizeObserver(measure)
    if (viewport.value) observer.observe(viewport.value)
    measure()
    if (image.value?.complete && image.value.naturalWidth) image.value.dispatchEvent(new Event('load'))
})
onBeforeUnmount(() => { observer?.disconnect(); pointers.clear() })
</script>

<template>
    <div ref="viewport" class="image-viewer" :class="{ 'image-viewer-touch': interactive, 'image-viewer-zoomed': transform.scale > 1 }"
        @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd"
        @lostpointercapture="pointerEnd" @dragstart.prevent>
        <img ref="image" :src="src" :alt="alt" draggable="false"
            :style="{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }"
            @load="loaded" @error="emit('error', $event)" />
        <div v-if="interactive" class="image-zoom-controls" role="group" aria-label="Image zoom"
            @pointerdown.stop @pointerup.stop @pointercancel.stop @click.stop>
            <button type="button" aria-label="Zoom out" :disabled="transform.scale <= 1" @click="changeZoom(-0.5)">−</button>
            <button type="button" class="image-zoom-reset" aria-label="Fit image to screen" @click="reset">{{ Math.round(transform.scale * 100) }}%</button>
            <button type="button" aria-label="Zoom in" :disabled="transform.scale >= 5" @click="changeZoom(0.5)">+</button>
        </div>
    </div>
</template>

<style scoped>
.image-viewer { position: relative; display: flex; min-width: 0; min-height: 0; width: 100%; height: 100%; overflow: hidden; }
.image-viewer img { display: block; width: 100%; height: 100%; min-height: 0; object-fit: contain; transform-origin: center; user-select: none; -webkit-user-drag: none; }
.image-viewer-touch { touch-action: none; }
.image-viewer-zoomed { cursor: grab; }
.image-viewer-zoomed:active { cursor: grabbing; }
.image-zoom-controls { position: absolute; bottom: 0.75rem; left: 50%; display: flex; transform: translateX(-50%); padding: 0.125rem; border: 1px solid var(--color-divider, #444); border-radius: 0.875rem; background: var(--color-surface, #1a1a1d); color: var(--color-foreground, white); box-shadow: 0 4px 18px #0004; }
.image-zoom-controls button { display: grid; place-items: center; min-width: 2.75rem; min-height: 2.75rem; padding: 0 0.625rem; border: 0; border-radius: 0.625rem; background: transparent; color: inherit; font-size: 1.25rem; cursor: pointer; touch-action: manipulation; }
.image-zoom-controls .image-zoom-reset { min-width: 4rem; font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
.image-zoom-controls button:disabled { opacity: 0.35; cursor: default; }
.image-zoom-controls button:focus-visible { outline: 2px solid var(--color-accent, #8b7cff); outline-offset: -2px; }
</style>
