<template>
    <div
        class="item-filters"
        role="group"
        :aria-label="label"
    >
        <button
            v-for="option in options"
            :key="option"
            type="button"
            class="filter-btn"
            :class="{ active: model === option }"
            :aria-pressed="model === option"
            @click="model = option"
        >
            {{ option }}
        </button>
    </div>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        options: readonly string[]
        label?: string
    }>(),
    { label: 'Filter items' }
)

const model = defineModel<string>({ required: true })
</script>

<style scoped>
.item-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
}

.filter-btn {
    flex-shrink: 0;
    height: var(--ui-control-height, 2.5rem);
    padding: 0 0.75rem;
    color: #a8a8b0;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: var(--ui-control-radius, 8px);
    font-family: 'Inter', sans-serif;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    cursor: pointer;
    transition:
        background 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
    line-height: 1.5;
    box-sizing: border-box;
}

.filter-btn:hover {
    color: #ffffff;
    background: #242429;
    border-color: #35353c;
}

.filter-btn.active {
    color: #ffffff;
    background: #3c47be;
    border-color: #3c47be;
}

.filter-btn:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}
</style>
