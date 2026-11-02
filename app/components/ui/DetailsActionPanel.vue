<script setup lang="ts">
import { useEventListener, useMediaQuery } from '@vueuse/core'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ title: string }>()
const open = defineModel<boolean>({ default: false })
const compact = useMediaQuery('(max-width: 1100px)')
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const headingId = useId()
let previousFocus: HTMLElement | null = null

watch(open, async value => {
    if (!compact.value) return
    if (value) {
        previousFocus = document.activeElement as HTMLElement | null
        await nextTick()
        closeButton.value?.focus()
    } else {
        previousFocus?.focus()
    }
})
watch(compact, value => { if (!value) open.value = false })

useEventListener(panel, 'keydown', (event: KeyboardEvent) => {
    if (!compact.value || !open.value) return
    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        open.value = false
    } else if (event.key === 'Tab') {
        const elements = Array.from(panel.value?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'
        ) ?? []).filter(element => element.getClientRects().length > 0)
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
        }
    }
})
</script>

<template>
    <div v-if="compact && open" class="details-panel-backdrop" @click="open = false" />
    <aside ref="panel" v-bind="$attrs" :class="{ 'mobile-panel-open': open }"
        :role="compact && open ? 'dialog' : undefined" :aria-modal="compact && open ? true : undefined"
        :aria-labelledby="compact && open ? headingId : undefined">
        <div class="details-panel-heading">
            <h2 :id="headingId">{{ props.title }}</h2>
            <button ref="closeButton" type="button" class="details-bar-button" aria-label="Close actions" @click="open = false">
                <Icon name="solar:close-circle-linear" size="24" />
            </button>
        </div>
        <slot />
    </aside>
</template>
