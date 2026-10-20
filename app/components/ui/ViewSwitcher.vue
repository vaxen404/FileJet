<template>
    <div class="view-switcher" role="group" aria-label="View mode">
        <button
            type="button"
            class="view-button"
            :class="{ active: modelValue === 'grid' }"
            :aria-pressed="modelValue === 'grid'"
            aria-label="Grid view"
            @click="emit('update:modelValue', 'grid')"
        >
            <Icon
                name="solar:widget-4-linear"
                class="view-icon"
                aria-hidden="true"
            />
        </button>

        <button
            type="button"
            class="view-button"
            :class="{ active: modelValue === 'list' }"
            :aria-pressed="modelValue === 'list'"
            aria-label="List view"
            @click="emit('update:modelValue', 'list')"
        >
            <Icon
                name="solar:list-linear"
                class="view-icon"
                aria-hidden="true"
            />
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: 'grid' | 'list'
}>()

const emit = defineEmits<{
    'update:modelValue': [value: 'grid' | 'list']
}>()
</script>

<style scoped>
.view-switcher {
    width: 6rem;
    height: var(--ui-control-height, 2.5rem);
    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #1f1f23;

    padding: 3px;
    gap: 3px;

    border: 1px solid #29292e;
    border-radius: var(--ui-control-radius, 8px);
    box-sizing: border-box;
}

.view-button {
    flex: 1;
    height: 100%;
    min-width: 0;
    padding: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #ffffff;
    background: transparent;

    border: none;
    border-radius: var(--ui-control-inner-radius, 4px);

    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    line-height: 1.5;
}

.view-button:hover {
    background: #2a2a2f;
}

.view-button.active {
    background: #3c47be;
}

.view-icon {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    font-size: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
    color: #ffffff;
}

.view-button:focus-visible {
    outline: 2px solid #b0a5ff;
    outline-offset: -2px;
}
</style>
