<script setup lang="ts">
defineProps<{
    viewMode: 'list' | 'grid'
    isDragging?: boolean
    isLoading?: boolean
    dropText?: string
}>()

const emit = defineEmits<{
    dragover: []
    dragleave: []
    drop: [event: DragEvent]
}>()
</script>

<template>
    <div
        class="data-view"
        :aria-busy="isLoading"
        :class="[
            viewMode === 'list' ? 'list-view' : 'grid-view',
            { 
                'drag-active': isDragging,
                'empty-view': $slots.empty && !isLoading,
                'loading-view': isLoading
            }
        ]"
        @dragover.prevent="emit('dragover')"
        @dragleave.prevent="emit('dragleave')"
        @drop.prevent="emit('drop', $event)"
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

        <div
            v-if="isDragging"
            class="drop-overlay"
        >
            {{ dropText }}
        </div>
    </div>
</template>

<style scoped>
.data-view {
    position: relative;

    flex: 1;
    min-width: 0;
    min-height: 0;
}

.list-view {
    display: flex;
    flex-direction: column;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-top-left-radius: 0.625rem;
    border-top-right-radius: 0.625rem;

    overflow: hidden;
}

.grid-view {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-content: start;

    gap: 1rem;

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

    gap: 0.45rem;

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

    font-size: 0.95rem;
    font-weight: 600;
}

.data-view :deep(.empty-state-description) {
    color: #898991;

    font-size: 0.825rem;
}

.drop-overlay {
    position: absolute;
    inset: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #121214e0;

    border: 2px dashed #5a5aff;
    border-radius: 0.8rem;

    color: white;

    font-size: 1.2rem;
    font-weight: 600;

    z-index: 20;

    pointer-events: none;
}

@media (max-width: 1500px) {
    .grid-view {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>
