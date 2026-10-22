<template>
    <div
        class="file-card"
        :class="{ selected }"
    >
        <div class="file-preview">
            <slot name="preview"
                ><div class="file-preview-placeholder"><Icon :name="icon" /></div
            ></slot>
            <div
                class="file-overlay"
                @click.stop
            >
                <slot name="actions" />
            </div>
        </div>
        <div class="file-details">
            <slot name="title"
                ><strong
                    class="file-name-input"
                    :title="title"
                    >{{ title }}</strong
                ></slot
            >
            <div class="file-metadata"><slot name="metadata" /></div>
        </div>
    </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ selected?: boolean; title?: string; icon?: string }>(), {
    selected: false,
    title: '',
    icon: 'solar:file-bold'
})
</script>

<style scoped>
.file-card {
    min-width: 0;
    overflow: hidden;
    min-height: 10rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: var(--ui-panel-radius, 24px);
    box-sizing: border-box;
    cursor: pointer;
    transition:
        border-color 0.2s,
        background 0.2s;
    gap: 0.5rem;
}

.file-card:hover {
    background: #202024;
    border-color: #454550;
}

.file-card.selected {
    border-color: #454550;
}

.file-card.selected .file-preview::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    box-sizing: border-box;
    border: 2px solid #7865ee;
    border-radius: inherit;
    pointer-events: none;
}

.file-preview {
    position: relative;
    width: 100%;
    border-radius: max(0px, calc(var(--ui-panel-radius, 24px) - 0.75rem - 1px));
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #141417;
    flex-shrink: 0;
}

.file-preview :deep(.file-preview-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
}

.file-card:hover :deep(.file-preview-image) {
    transform: scale(1.035);
}

.file-preview-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5a5aff;
    font-size: 3.5rem;
}

.file-overlay {
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.5rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}

.file-card:hover .file-overlay,
.file-card.selected .file-overlay,
.file-card:focus-within .file-overlay {
    opacity: 1;
    pointer-events: auto;
}

.file-overlay :deep(.file-select) {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #36363ee6;
    border: 1px solid #3a3a42;
    border-radius: 50%;
    cursor: pointer;
}

.file-overlay :deep(.file-select input) {
    width: 1.1rem;
    height: 1.1rem;
    margin: 0;
    accent-color: #7063d8;
    cursor: pointer;
}

.file-details {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.file-details :deep(.file-name-input) {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #f3f3f5;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    outline: none;
    box-sizing: border-box;
    line-height: 1.5;
    min-height: 1.5rem;
}

.file-details :deep(.file-name-input:disabled) {
    opacity: 1;
    -webkit-text-fill-color: #f3f3f5;
    cursor: pointer;
}

.file-details :deep(.file-name-input.active) {
    border-color: #7063d8;
    padding: 0 0.25rem;
}

.file-metadata {
    display: flex;
    align-items: center;
    gap: 0.175rem;
    color: #898991;
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.5;
    min-width: 0;
}

.file-metadata :deep(span) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-metadata :deep(span:first-child) {
    flex-shrink: 0;
}

@media (hover: none) {
    .file-overlay {
        opacity: 1;
        pointer-events: auto;
    }
}
</style>
