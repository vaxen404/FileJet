<template>
    <div class="search-box">
        <Icon name="lucide:search" class="search-icon" />

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
    height: 2.3rem;

    display: flex;
    align-items: center;

    background: #1a1a1d;

    padding: 0.25rem 0.8rem;

    border: 1px solid #29292e;
    border-radius: 0.625rem;

    gap: 0.475rem;

    transition: border-color 0.2s ease;
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

    font-size: 0.9rem;
}

.search-icon {
    color: #a3a3a3;
    font-size: 1.3rem;
}
</style>