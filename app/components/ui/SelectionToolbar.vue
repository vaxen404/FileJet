<template>
    <div
        v-if="items.length"
        class="selection-region"
    >
        <div class="selection-dock">
            <span class="selection-count">{{ items.length }} selected</span>
            <div class="selection-buttons">
                <button
                    type="button"
                    :disabled="working"
                    @click="$emit('clear')"
                >
                    <Icon name="solar:checklist-minimalistic-linear" />
                    Deselect all
                </button>
                <button
                    type="button"
                    :disabled="working"
                    @click="moveModalOpen = true"
                >
                    <Icon name="solar:folder-path-connect-linear" />
                    Move
                </button>
                <button
                    type="button"
                    :disabled="working"
                    @click="download"
                >
                    <Icon name="solar:download-linear" />
                    {{ isDownloading ? 'Preparing...' : 'Download' }}
                </button>
                <button
                    type="button"
                    class="delete-button"
                    :disabled="working"
                    @click="$emit('delete')"
                >
                    <Icon name="solar:trash-bin-trash-linear" />
                    Delete
                </button>
            </div>
            <button
                type="button"
                class="dismiss-button"
                :disabled="working"
                @click="$emit('clear')"
            >
                <Icon name="solar:close-circle-linear" />
            </button>
        </div>
    </div>
    <MoveItemsModal
        :open="moveModalOpen"
        :items="items"
        :current-folder-id="currentFolderId"
        @close="moveModalOpen = false"
        @pending="isMoving = $event"
        @moved="$emit('moved')"
    />
</template>

<script setup lang="ts">
import type { SelectionItem } from '~~/shared/schemas/selection'

const props = withDefaults(
    defineProps<{
        items: SelectionItem[]
        busy?: boolean
        currentFolderId?: string | null
    }>(),
    { busy: false }
)

defineEmits<{ clear: []; delete: []; moved: [] }>()
const moveModalOpen = ref(false)
const isMoving = ref(false)
const { downloadItems, isDownloading } = useItemActions()
const { openToast } = useToast()
const working = computed(() => props.busy || isMoving.value || isDownloading.value)

const download = async () => {
    if (working.value) return

    try {
        await downloadItems([...props.items])
    } catch (error: any) {
        openToast(
            error.data?.message || error.message || 'Could not download the selection.',
            'error'
        )
    }
}
</script>

<style scoped>
.selection-region {
    container-type: inline-size;
    width: 100%;
    flex-shrink: 0;
}

.selection-dock {
    display: flex;
    align-items: center;
    align-self: center;
    flex: 0 0 auto;
    gap: 0.75rem;
    width: max-content;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0.75rem auto 0;
    padding: 0.5rem 0.75rem 0.5rem 1rem;
    color: #f3f3f5;
    background: #1a1a1d;
    border: 1px solid #35353c;
    border-radius: 999px;
    box-shadow: 0 6px 24px #0003;
}

.selection-count {
    flex-shrink: 0;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    white-space: nowrap;
}

.selection-buttons {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    background: #202024;
    border: 1px solid #35353c;
    border-radius: 999px;
}

button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    gap: 0.4rem;
    min-height: 2.25rem;
    padding: 0 0.75rem;
    color: #d5d5da;
    background: transparent;
    border: 0;
    border-radius: 0;
    font: inherit;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
}

.selection-buttons button + button {
    border-left: 1px solid #35353c;
}

button:hover:not(:disabled) {
    color: #fff;
    background: #2d2d33;
}

button:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: -3px;
}

button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

button .iconify {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    font-size: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
}

.delete-button {
    color: #ff6b7b;
}

.delete-button:hover:not(:disabled) {
    color: #ff8793;
    background: #3a2024;
}

.dismiss-button {
    width: 2.25rem;
    padding: 0;
    border-radius: 50%;
}

@container (max-width: 700px) {
    .selection-dock {
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 18px;
    }

    .selection-buttons {
        order: 3;
        flex: 1 1 100%;
        flex-wrap: wrap;
        border-radius: 12px;
    }

    .selection-buttons button {
        flex: 1 1 auto;
        min-height: 2.5rem;
    }
}
</style>
