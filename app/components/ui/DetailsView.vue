<template>
    <div
        class="details-view w-full with-preview:grid with-preview:grid-cols-[minmax(0,_1fr)_28rem]
            with-preview:gap-4 max-preview:with-preview:grid-cols-1"
        :class="{ 'with-preview': previewable }"
    >
        <div
            v-if="previewable"
            class="previewable-side min-w-0 min-h-0"
        >
            <slot name="preview" />
        </div>

        <div class="details-side min-w-0 min-h-0 overflow-auto">
            <slot name="details" />
        </div>
    </div>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        previewable?: boolean
    }>(),
    {
        previewable: false
    }
)
</script>
