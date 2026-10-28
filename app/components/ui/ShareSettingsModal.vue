<template>
    <dialog
        ref="dialog"
        :aria-labelledby="`${id}-title`"
        class="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-divider bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/65"
        @cancel.prevent="close"
    >
        <template v-if="item">
            <header class="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
                <div class="min-w-0">
                    <h2 :id="`${id}-title`" class="text-sm font-semibold">Share settings</h2>
                    <p class="mt-1 truncate text-xs text-muted" :title="item.name">{{ item.name }}</p>
                </div>
                <button type="button" :disabled="saving" aria-label="Close share settings" class="grid size-8 shrink-0 cursor-pointer place-items-center rounded-control text-label hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40" @click="close">
                    <Icon name="solar:close-circle-linear" size="20" />
                </button>
            </header>
            <div class="p-5">
                <ShareBox
                    :key="item.id"
                    :item-id="item.itemId"
                    :item-type="item.itemType"
                    :initial-state="initialState"
                    :allow-remove="false"
                    embedded
                    @saving-change="saving = $event"
                    @changed="emit('changed', $event)"
                />
            </div>
        </template>
    </dialog>
</template>

<script setup lang="ts">
import type { SharedListItem, ShareState } from '~~/shared/types/share'

const props = defineProps<{ item: SharedListItem | null }>()
const emit = defineEmits<{ close: []; changed: [state: ShareState] }>()
const saving = defineModel<boolean>('saving', { default: false })
const dialog = ref<HTMLDialogElement | null>(null)
const id = useId()
const initialState = computed<ShareState | undefined>(() => props.item ? {
    url: props.item.url,
    hasPassword: props.item.hasPassword,
    expiresAt: props.item.expiresAt,
    isExpired: Boolean(props.item.expiresAt && new Date(props.item.expiresAt).getTime() <= Date.now())
} : undefined)

const close = () => {
    if (!saving.value) emit('close')
}

watch(() => props.item?.id, async itemId => {
    if (!itemId) {
        dialog.value?.close()
        return
    }

    saving.value = false
    await nextTick()

    if (props.item?.id === itemId && dialog.value?.isConnected && !dialog.value.open) {
        dialog.value.showModal()
    }
}, { immediate: true, flush: 'post' })
</script>
