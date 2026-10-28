<template>
    <div
        class="data-view relative flex flex-col flex-1 min-w-0 min-h-0 rounded-panel
        with-list-pagination:rounded-bl-none with-list-pagination:rounded-br-none"
        :class="{ 'drag-active': isDragging }"
        @dragenter="dragenter"
        @dragover="handleDragover"
        @dragleave="handleDragleave"
        @drop="drop"
    >
        <div
            class="view-content flex-1 min-h-0 min-w-0 is-list-view:flex is-list-view:flex-col is-list-view:bg-surface
            is-list-view:border is-list-view:border-divider is-list-view:rounded-[inherit]
            is-list-view:overflow-hidden is-grid-view:grid is-grid-view:grid-cols-[repeat(5,_1fr)]
            is-grid-view:content-start is-grid-view:gap-3 is-grid-view:overflow-y-auto empty-view:flex
            empty-view:items-center empty-view:justify-center loading-view:flex loading-view:items-center
            loading-view:justify-center max-desktop:is-grid-view:grid-cols-[repeat(4,_1fr)] max-laptop:is-grid-view:grid-cols-3 max-tablet:is-grid-view:grid-cols-2 max-phone:is-grid-view:grid-cols-1"
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
