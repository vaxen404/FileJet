<script setup lang="ts">
defineProps<{
    viewMode: 'list' | 'grid'
    isDragging?: boolean
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
        :class="[
            viewMode === 'list' ? 'list-view' : 'grid-view',
            { 'drag-active': isDragging }
        ]"
        @dragover.prevent="emit('dragover')"
        @dragleave.prevent="emit('dragleave')"
        @drop.prevent="emit('drop', $event)"
    >
        <slot :name="viewMode" />

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