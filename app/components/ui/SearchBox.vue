<template>
    <div class="search-box w-128 h-control flex items-center bg-surface py-0 px-3 border border-divider
        rounded-control gap-2 transition-colors duration-200 ease-[ease] min-w-0
        focus-within:border-highlight">
        <Icon
            name="lucide:search"
            class="search-icon block shrink-0 text-muted text-control-icon size-control-icon"
        />

        <input class="bg-transparent border-0 outline-none text-content text-control-size font-medium leading-normal
            min-w-0 p-0 size-full"
            type="search"
            :aria-label="placeholder || 'Search'"
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
