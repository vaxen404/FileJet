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

<template>
    <div
        class="details-view"
        :class="{ 'with-preview': previewable }"
    >
        <div
            v-if="previewable"
            class="previewable-side"
        >
            <slot name="preview" />
        </div>

        <div class="details-side">
            <slot name="details" />
        </div>
    </div>
</template>

<style scoped>
.details-view {
    width: 100%;
}

.details-view.with-preview {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 26rem;
    gap: 1rem;
}

.preview-side,
.details-side {
    min-width: 0;
}
</style>