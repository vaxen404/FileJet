<template>
    <div class="view-switcher w-24 h-control shrink-0 flex items-center justify-center bg-surface-hover p-[3px]
        gap-[3px] border border-divider rounded-control">
        <button
            type="button"
            aria-label="Grid view"
            :aria-pressed="modelValue === 'grid'"
            class="view-button flex-1 h-full min-w-0 p-0 flex items-center justify-center text-white bg-transparent
            border-0 rounded-control-inner cursor-pointer text-control-size font-medium leading-normal
            hover:bg-[#2a2a2f] is-active:bg-primary focus-visible:outline-2 focus-visible:outline-accent
            focus-visible:-outline-offset-2"
            :class="{ active: modelValue === 'grid' }"
            @click="emit('update:modelValue', 'grid')"
        >
            <Icon
                name="solar:widget-4-linear"
                class="view-icon block text-control-icon shrink-0 text-white size-control-icon"
            />
        </button>

        <button
            type="button"
            aria-label="List view"
            :aria-pressed="modelValue === 'list'"
            class="view-button flex-1 h-full min-w-0 p-0 flex items-center justify-center text-white bg-transparent
            border-0 rounded-control-inner cursor-pointer text-control-size font-medium leading-normal
            hover:bg-[#2a2a2f] is-active:bg-primary focus-visible:outline-2 focus-visible:outline-accent
            focus-visible:-outline-offset-2"
            :class="{ active: modelValue === 'list' }"
            @click="emit('update:modelValue', 'list')"
        >
            <Icon
                name="solar:list-linear"
                class="view-icon block text-control-icon shrink-0 text-white size-control-icon"
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
