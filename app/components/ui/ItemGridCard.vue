<template>
    <div
        class="file-card group/file-card min-w-0 overflow-hidden min-h-40 p-3 flex flex-col justify-start
            bg-surface border border-divider rounded-3xl cursor-pointer transition-colors duration-200 gap-2
            hover:bg-control hover:border-hover-border selected:border-hover-border"
        :class="{ selected }"
    >
        <div class="file-preview relative w-full rounded-[11px] aspect-4/3 overflow-hidden bg-preview shrink-0" :class="{ selected }">
            <slot name="preview">
                <div class="file-preview-placeholder h-full flex items-center justify-center text-highlight text-[3.5rem]">
                    <Icon :name="icon" />
                </div>
            </slot>
            <div
                class="file-overlay absolute inset-x-0 top-0 z-2 flex items-start justify-between p-2 transition-opacity
                    duration-200 folder-overlay-empty:pointer-events-none group-hover/file-card:opacity-100
                    group-hover/file-card:pointer-events-auto group-focus-within/file-card:opacity-100
                    group-focus-within/file-card:pointer-events-auto touch:opacity-100 touch:pointer-events-auto" :class="selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
                @click.stop
            >
                <slot name="actions" />
            </div>
        </div>
        <div class="file-details p-0 flex flex-col min-w-0">
            <slot name="title">
                <strong class="file-name-input grid-name-input" :title="title">{{ title }}</strong>
            </slot>
            <div class="file-metadata flex items-center gap-[0.175rem] text-muted text-xs font-normal leading-normal min-w-0">
                <slot name="metadata" />
            </div>
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
.file-preview.selected::after {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 2px solid var(--color-accent);
    border-radius: inherit;
    pointer-events: none;
    content: '';
}
</style>
