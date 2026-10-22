<template>
    <div
        class="data-view"
        :class="{ 'drag-active': isDragging }"
        @dragenter="dragenter"
        @dragover="handleDragover"
        @dragleave="handleDragleave"
        @drop="drop"
    >
        <div
            class="view-content"
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
        <div
            v-if="isDragging"
            class="drop-overlay"
        >
            <span class="drop-message"><Icon name="solar:cloud-upload-bold" />{{ dropText }}</span>
        </div>
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
.data-view {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    border-radius: var(--ui-panel-radius, 24px);
}

.data-view:has(+ .pagination:not(.grid-pagination)) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.view-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
}

.data-view :deep(.loading-state) {
    color: #a8a8b0;
    font-size: 0.85rem;
}

.list-view {
    display: flex;
    flex-direction: column;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: inherit;

    overflow: hidden;
}

.grid-view {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-content: start;

    gap: 0.75rem;

    overflow-y: auto;
}

.empty-view,
.loading-view {
    display: flex;
    align-items: center;
    justify-content: center;
}

.data-view :deep(.empty-state) {
    width: 100%;
    min-height: 12rem;

    padding: 2rem 1rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 0.5rem;

    text-align: center;

    box-sizing: border-box;
}

.data-view :deep(.empty-state-icon) {
    display: block;
    flex-shrink: 0;

    margin-bottom: 0.5rem;

    color: #8b7cff;

    font-size: 2.5rem;
}

.data-view :deep(.empty-state-folder-icon) {
    color: #5da9ff;
}

.data-view :deep(.empty-state strong) {
    color: #f5f5f5;

    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.5;
}

.data-view :deep(.empty-state-description) {
    color: #898991;

    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
}

.drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #5a5aff;
    border-radius: inherit;
    pointer-events: none;
    z-index: 20;
}

.drop-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: calc(100% - 2rem);
    padding: 0.75rem 1rem;
    color: #d5d5da;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
}

.drop-message :deep(.iconify) {
    color: #8b7cff;
    flex-shrink: 0;
}

@media (max-width: 1500px) {
    .grid-view {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>
