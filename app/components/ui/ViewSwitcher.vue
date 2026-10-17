<template>
    <div class="view-switcher">
        <button
            type="button"
            class="view-button"
            :class="{ active: modelValue === 'grid' }"
            @click="emit('update:modelValue', 'grid')"
        >
            <Icon name="solar:widget-4-linear" class="view-icon" />
        </button>

        <button
            type="button"
            class="view-button"
            :class="{ active: modelValue === 'list' }"
            @click="emit('update:modelValue', 'list')"
        >
            <Icon name="solar:list-linear" class="view-icon" />
        </button>

    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: 'grid' | 'list'
}>()

const emit = defineEmits<{
    'update:modelValue': [value: 'grid' | 'list' ]
}>()
</script>

<style scoped>
.view-switcher {
    width: 6rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #1f1f23;

    padding: 0.25rem;

    border: 1px solid #29292e;
    border-radius: 6px;
    box-sizing: border-box;
}

.view-button {
    flex: 1;
    height: 100%;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #ffffff;
    background: transparent;

    border: none;
    border-radius: 6px;

    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
}

.view-button:hover {
    background: #2a2a2f;
}

.view-button.active {
    background: #343c8f;
}

.view-icon {
    font-size: 1.1rem;
    color: #ffffff;
}
</style>