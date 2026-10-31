<template>
    <div
        class="data-view relative flex flex-col flex-1 min-w-0 min-h-0 rounded-3xl
            with-list-pagination:rounded-bl-none with-list-pagination:rounded-br-none"
        :class="{ 'drag-active': isDragging }"
        @dragenter="dragenter"
        @dragover="handleDragover"
        @dragleave="handleDragleave"
        @drop="drop"
    >
        <div
            class="view-content flex-1 min-h-0 min-w-0"
            :class="[
                viewMode === 'list' ? 'list-view' : 'grid-view',
                { 'empty-view': $slots.empty && !isLoading, 'loading-view': isLoading }
            ]"
        >
            <slot
                v-if="isLoading"
                name="loading"
            />
            <slot
                v-else-if="$slots.empty"
                name="empty"
            />
            <slot
                v-else
                :name="viewMode"
            />
        </div>
        <Transition name="fade">
            <div
                v-if="isDragging"
                class="drop-overlay absolute inset-0 flex items-center justify-center border-2 border-dashed
                    border-highlight rounded-[inherit] pointer-events-none z-20"
            >
                <span class="drop-message flex items-center gap-2 max-w-[calc(100%_-_2rem)] py-3 px-4 text-content bg-surface
                    border border-divider rounded-md text-sm leading-[inherit] font-medium text-center"><Icon class="text-accent shrink-0" name="solar:cloud-upload-bold" />{{ dropText }}</span>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    viewMode: 'list' | 'grid'
    isDragging?: boolean
    isLoading?: boolean
    dropText?: string
}>()

const emit = defineEmits<{
    dragover: [event: DragEvent]
    dragleave: [event: DragEvent]
    drop: [event: DragEvent]
}>()

const { isDragging, dragenter, dragover, dragleave, drop } = useFileDrop(
    event => emit('drop', event),
    () => Boolean(props.dropText)
)

const handleDragover = (event: DragEvent) => {
    dragover(event)

    if (isDragging.value) emit('dragover', event)
}

const handleDragleave = (event: DragEvent) => {
    dragleave(event)

    if (!isDragging.value) emit('dragleave', event)
}
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";

@layer components {
    .view-content.list-view {
        @apply flex flex-col overflow-hidden rounded-[inherit] border border-divider bg-surface;
    }

    .view-content.grid-view {
        @apply grid grid-cols-5 content-start gap-3 overflow-y-auto;
        @apply max-desktop:grid-cols-4 max-laptop:grid-cols-3 max-tablet:grid-cols-2 max-phone:grid-cols-1;
    }

    .view-content.empty-view,
    .view-content.loading-view {
        @apply flex items-center justify-center;
    }
}
</style>
