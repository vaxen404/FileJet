<template>
    <div
        v-if="items.length"
        class="selection-region @container w-full shrink-0"
    >
        <div class="selection-dock flex items-center self-center flex-none gap-3 w-max max-w-full mt-3 mr-auto mb-0
            ml-auto pt-2 pr-3 pb-2 pl-4 text-foreground bg-surface border border-[#35353c] rounded-full
            shadow-[0_6px_24px_#0003] dock-compact:flex-wrap dock-compact:justify-between dock-compact:gap-2
            dock-compact:p-3 dock-compact:rounded-[18px]">
            <span class="selection-count shrink-0 text-control-size font-medium whitespace-nowrap">{{ items.length }} selected</span>
            <div class="selection-buttons flex items-stretch overflow-hidden bg-control border border-[#35353c] rounded-full
                dock-compact:order-3 dock-compact:[flex:1_1_100%] dock-compact:flex-wrap dock-compact:rounded-xl">
                <button class="inline-flex items-center justify-center shrink-0 gap-[0.4rem] min-h-9 py-0 px-3 text-[#d5d5da]
                    bg-transparent border-0 rounded-none text-control-size font-medium whitespace-nowrap cursor-pointer
                    not-first:border-l not-first:border-l-[#35353c] hover:enabled:text-white hover:enabled:bg-[#2d2d33]
                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-3
                    disabled:opacity-45 disabled:cursor-not-allowed dock-compact:flex-auto dock-compact:min-h-10"
                    type="button"
                    :disabled="working"
                    @click="$emit('clear')"
                >
                    <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:checklist-minimalistic-linear" />
                    Deselect all
                </button>
                <button class="inline-flex items-center justify-center shrink-0 gap-[0.4rem] min-h-9 py-0 px-3 text-[#d5d5da]
                    bg-transparent border-0 rounded-none text-control-size font-medium whitespace-nowrap cursor-pointer
                    not-first:border-l not-first:border-l-[#35353c] hover:enabled:text-white hover:enabled:bg-[#2d2d33]
                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-3
                    disabled:opacity-45 disabled:cursor-not-allowed dock-compact:flex-auto dock-compact:min-h-10"
                    type="button"
                    :disabled="working"
                    @click="moveModalOpen = true"
                >
                    <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:folder-path-connect-linear" />
                    Move
                </button>
                <button class="inline-flex items-center justify-center shrink-0 gap-[0.4rem] min-h-9 py-0 px-3 text-[#d5d5da]
                    bg-transparent border-0 rounded-none text-control-size font-medium whitespace-nowrap cursor-pointer
                    not-first:border-l not-first:border-l-[#35353c] hover:enabled:text-white hover:enabled:bg-[#2d2d33]
                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-3
                    disabled:opacity-45 disabled:cursor-not-allowed dock-compact:flex-auto dock-compact:min-h-10"
                    type="button"
                    :disabled="working"
                    @click="download"
                >
                    <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:download-linear" />
                    {{ isDownloading ? 'Preparing...' : 'Download' }}
                </button>
                <button
                    type="button"
                    class="delete-button inline-flex items-center justify-center shrink-0 gap-[0.4rem] min-h-9 py-0 px-3
                    text-[#ff6b7b] bg-transparent border-0 rounded-none text-control-size font-medium whitespace-nowrap
                    cursor-pointer not-first:border-l not-first:border-l-[#35353c] hover:enabled:text-[#ff8793]
                    hover:enabled:bg-[#3a2024] focus-visible:outline-2 focus-visible:outline-accent
                    focus-visible:-outline-offset-3 disabled:opacity-45 disabled:cursor-not-allowed
                    dock-compact:flex-auto dock-compact:min-h-10"
                    :disabled="working"
                    @click="$emit('delete')"
                >
                    <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:trash-bin-trash-linear" />
                    Delete
                </button>
            </div>
            <button
                type="button"
                class="dismiss-button inline-flex items-center justify-center shrink-0 gap-[0.4rem] min-h-9 p-0
                text-[#d5d5da] bg-transparent border-0 rounded-full text-control-size font-medium whitespace-nowrap
                cursor-pointer w-9 hover:enabled:text-white hover:enabled:bg-[#2d2d33] focus-visible:outline-2
                focus-visible:outline-accent focus-visible:-outline-offset-3 disabled:opacity-45
                disabled:cursor-not-allowed"
                :disabled="working"
                @click="$emit('clear')"
            >
                <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:close-circle-linear" />
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
