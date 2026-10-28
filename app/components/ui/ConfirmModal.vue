<template>
    <Teleport to="body">
        <Transition name="modal">
            <div
                v-if="show"
                class="modal-overlay fixed inset-0 z-10000 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
                @click.self="emit('cancel')"
            >
                <div
                    ref="dialog"
                    role="alertdialog"
                    aria-modal="true"
                    :aria-labelledby="titleId"
                    :aria-describedby="messageId"
                    class="confirm-modal max-h-[calc(100dvh_-_2rem)] overflow-y-auto w-full max-w-100 rounded-xl border border-divider bg-surface p-6 shadow-2xl"
                    @keydown.esc.prevent.stop="emit('cancel')"
                    @keydown.tab="trapFocus"
                >
                    <h3 :id="titleId" class="mb-2 text-base font-semibold text-foreground">{{ title }}</h3>

                    <p :id="messageId" class="text-sm leading-6 text-label">{{ message }}</p>

                    <div class="modal-actions mt-6 flex justify-end gap-3">
                        <button
                            ref="cancelButton"
                            type="button"
                            class="cancel-button h-10 cursor-pointer rounded-control border border-control-border bg-control px-4 text-xs font-medium text-secondary hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            @click="emit('cancel')"
                        >
                            {{ cancelText || 'Cancel' }}
                        </button>

                        <button
                            type="button"
                            class="confirm-button h-10 cursor-pointer rounded-control border px-4 text-xs font-medium text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            :class="variant === 'danger' ? 'border-red-700 bg-red-700 hover:bg-red-600' : 'border-primary bg-primary hover:brightness-110'"
                            @click="emit('confirm')"
                        >
                            {{ confirmText || 'Confirm' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    show: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'neutral'
}>(), { variant: 'danger' })

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const dialog = ref<HTMLElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)
const id = useId()
const titleId = `${id}-title`
const messageId = `${id}-message`
let previousFocus: HTMLElement | null = null

watch(() => props.show, async show => {
    if (!import.meta.client) return

    if (show) {
        previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
        await nextTick()
        if (props.show) cancelButton.value?.focus()
    } else {
        if (previousFocus?.isConnected) previousFocus.focus()
        previousFocus = null
    }
}, { immediate: true, flush: 'post' })

const trapFocus = (event: KeyboardEvent) => {
    const buttons = dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    if (!buttons?.length) return

    const first = buttons[0]
    const last = buttons[buttons.length - 1]

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
    }
}
</script>
