<template>
    <div class="search-box">
        <Icon
            name="lucide:search"
            class="search-icon"
        />

        <input
            type="text"
            :value="modelValue"
            :placeholder="placeholder || 'Search...'"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string
    placeholder?: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.search-box {
    width: 32rem;
    height: var(--ui-control-height, 2.5rem);

    display: flex;
    align-items: center;

    background: #1a1a1d;

    padding: 0 0.75rem;

    border: 1px solid #29292e;
    border-radius: var(--ui-control-radius, 8px);

    gap: 0.5rem;

    transition: border-color 0.2s ease;
    box-sizing: border-box;
    min-width: 0;
}

.search-box:focus-within {
    border-color: #5a5aff;
}

.search-box input {
    width: 100%;
    height: 100%;

    background: transparent;

    border: none;
    outline: none;

    color: #dadada;

    font-size: var(--ui-control-font-size, 0.875rem);
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    line-height: 1.5;
    min-width: 0;
    padding: 0;
}

.search-icon {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
    color: #a3a3a3;
    font-size: var(--ui-control-icon-size, 1.125rem);
}
</style>
