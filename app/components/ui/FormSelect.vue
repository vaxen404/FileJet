<template>
    <div class="min-w-0">
        <button ref="trigger" type="button" role="combobox" aria-haspopup="listbox" :aria-label="label" :aria-expanded="open" :aria-controls="menuId" :disabled="disabled" class="inbox-input flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50" @click="toggle" @keydown="triggerKey">
            <span class="min-w-0 truncate" :title="selectedLabel">{{ selectedLabel }}</span><Icon name="solar:alt-arrow-down-linear" class="shrink-0 transition-transform duration-150" :class="{ 'rotate-180': open }" />
        </button>
        <div :id="menuId" ref="menu" popover="auto" role="listbox" :aria-label="label" class="form-select-menu m-0 rounded-xl border border-control-border bg-surface-hover p-0.75 text-sm shadow-[0_0.6rem_2rem_rgba(0,_0,_0,_0.35)]" :style="position" @toggle="toggled" @keydown="menuKey">
            <button v-for="(option, index) in options" :key="option.value" type="button" role="option" :aria-selected="model === option.value" tabindex="-1" class="w-full shrink-0 cursor-pointer rounded-lg bg-transparent px-3 py-2 text-left text-sm font-medium leading-normal text-label hover:bg-raised hover:text-foreground focus:bg-raised focus:text-foreground focus:outline-none is-active:bg-raised is-active:text-foreground" :class="{ active: model === option.value }" @focus="active = index" @click="select(option.value)">{{ option.label }}</button>
        </div>
    </div>
</template>
<script setup lang="ts" generic="T extends string | number">
import type { CSSProperties } from 'vue'
const props = defineProps<{ label: string; options: { value: T; label: string }[]; disabled?: boolean }>()
const model = defineModel<T>({ required: true })
const trigger = ref<HTMLButtonElement | null>(null), menu = ref<HTMLElement | null>(null)
const menuId = `form-select-${useId()}`, open = ref(false), active = ref(0)
const selectedLabel = computed(() => props.options.find(option => option.value === model.value)?.label ?? '')
const position = ref<CSSProperties>({ position: 'fixed', inset: 'auto', margin: 0 })
const place = () => {
    if (!trigger.value) return
    const rect = trigger.value.getBoundingClientRect(), viewport = window.visualViewport
    const top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight)
    const below = Math.max(0, bottom - rect.bottom - 16), above = Math.max(0, rect.top - top - 16)
    const desired = Math.min(256, props.options.length * 40 + 8), up = below < desired && above > below
    const maxHeight = Math.max(40, Math.min(256, up ? above : below))
    const height = Math.min(maxHeight, menu.value?.scrollHeight ? menu.value.scrollHeight + 2 : desired)
    const width = Math.min(rect.width, window.innerWidth - 16)
    position.value = { position: 'fixed', inset: 'auto', margin: 0, width: `${width}px`, left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`, top: `${Math.max(top + 8, up ? rect.top - height - 8 : rect.bottom + 8)}px`, maxHeight: `${maxHeight}px`, overflowY: 'auto' }
}
const focusOption = () => {
    const option = menu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active.value]
    option?.focus({ preventScroll: true }); option?.scrollIntoView({ block: 'nearest' })
}
const close = (restore = true) => {
    if (menu.value?.isConnected && menu.value.matches(':popover-open')) menu.value.hidePopover()
    open.value = false
    if (restore) trigger.value?.focus({ preventScroll: true })
}
const show = async (index = props.options.findIndex(option => option.value === model.value)) => {
    if (props.disabled || !props.options.length) return
    active.value = Math.max(0, index); place(); await nextTick()
    if (props.disabled || !menu.value?.isConnected || trigger.value?.closest('dialog')?.open === false) return
    menu.value.showPopover(); open.value = true
    await nextTick(); place(); focusOption()
}
const toggle = () => { if (open.value) close(); else void show() }
const select = (value: T) => { model.value = value; close() }
const triggerKey = (event: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault(); event.stopPropagation()
    void show(event.key === 'Home' ? 0 : event.key === 'End' ? props.options.length - 1 : undefined)
}
let typed = '', typedAt = 0
const menuKey = (event: KeyboardEvent) => {
    if (event.key === 'Tab') { close(); return }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); const option = props.options[active.value]; if (option) select(option.value); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation()
        active.value = event.key === 'Home' ? 0 : event.key === 'End' ? props.options.length - 1 : (active.value + (event.key === 'ArrowDown' ? 1 : -1) + props.options.length) % props.options.length
        focusOption(); return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typed = Date.now() - typedAt > 700 ? event.key : typed + event.key; typedAt = Date.now()
        const index = props.options.findIndex(option => option.label.toLowerCase().startsWith(typed.toLowerCase()))
        if (index >= 0) { event.preventDefault(); active.value = index; focusOption() }
    }
}
const toggled = (event: Event) => { open.value = (event as ToggleEvent).newState === 'open' }
const reposition = () => { if (open.value) place() }
watch(() => props.disabled, disabled => { if (disabled) close(false) })
onMounted(() => { window.addEventListener('resize', reposition); window.addEventListener('scroll', reposition, true); window.visualViewport?.addEventListener('resize', reposition) })
onBeforeUnmount(() => { close(false); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); window.visualViewport?.removeEventListener('resize', reposition) })
</script>
<style scoped>
.form-select-menu:popover-open { display: flex; flex-direction: column; }
</style>
