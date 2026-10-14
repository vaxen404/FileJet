
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

<style scoped>
.details-view {
    width: 100%;
}

.details-view.with-preview {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 28rem;
    gap: 1rem;
}

.previewable-side,
.details-side {
    min-width: 0;
    min-height: 0;
}

.details-side {
    overflow: auto;
}

@media (max-width: 900px) {
    .details-view.with-preview {
        grid-template-columns: 1fr;
    }
}
</style>
