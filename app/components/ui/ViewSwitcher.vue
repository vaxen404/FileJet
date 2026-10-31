<template>
    <div class="view-switcher w-24 h-10 max-mobile:h-11 pointer-coarse:h-11 shrink-0 flex items-center
        justify-center bg-surface-hover p-0.75 gap-0.75 border border-divider rounded-lg">
        <button
            v-for="view in views"
            :key="view.value"
            type="button"
            :aria-label="view.label"
            :aria-pressed="modelValue === view.value"
            class="view-button flex-1 h-full min-w-0 p-0 flex items-center justify-center text-foreground
                bg-transparent border-0 rounded-sm cursor-pointer text-sm font-medium leading-normal hover:bg-raised
                is-active:bg-primary focus-visible:outline-2 focus-visible:outline-accent
                focus-visible:-outline-offset-2 is-active:text-on-primary is-active:hover:bg-primary
                is-active:hover:text-on-primary"
            :class="{ active: modelValue === view.value }"
            @click="emit('update:modelValue', view.value)"
        >
            <Icon
                :name="view.icon"
                class="block text-lg shrink-0 text-inherit size-4.5"
            />
        </button>
    </div>
</template>

<script setup lang="ts">
const views = [
    { value: 'grid', label: 'Grid view', icon: 'solar:widget-4-linear' },
    { value: 'list', label: 'List view', icon: 'solar:list-linear' }
] as const

defineProps<{
    modelValue: 'grid' | 'list'
}>()

const emit = defineEmits<{
    'update:modelValue': [value: 'grid' | 'list']
}>()
</script>
