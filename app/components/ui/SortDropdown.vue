<template>
    <div class="sort-dropdown relative shrink-0">
        <button
            type="button"
            class="sort-trigger h-control py-0 px-3 flex items-center gap-2 text-label bg-transparent border-0
            rounded-control text-control-size whitespace-nowrap cursor-pointer font-medium leading-normal
            hover:text-foreground hover:bg-surface-hover"
            @click="isOpen = !isOpen"
        >
            <Icon
                name="solar:sort-vertical-linear"
                class="sort-icon block text-control-icon shrink-0 size-control-icon"
            />

            <span>{{ currentLabel }}</span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="arrow-icon block text-control-icon shrink-0 size-control-icon transition-transform duration-150"
                :class="{ 'rotate-180': isOpen }"
            />
        </button>

        <Transition name="dropdown">
            <div
                v-if="isOpen"
                class="sort-menu absolute top-[calc(100%_+_0.5rem)] right-0 w-40 p-[3px] flex flex-col bg-surface-hover
                border border-control-border rounded-menu shadow-[0_0.6rem_2rem_rgba(0,_0,_0,_0.35)] z-50"
            >
                <button
                    v-for="option in options"
                    :key="option.value"
                    type="button"
                    class="sort-option w-full py-2 px-3 text-label bg-transparent border-0 rounded-control text-control-size
                    text-left cursor-pointer font-medium leading-normal hover:text-foreground hover:bg-raised
                    is-active:text-foreground is-active:bg-raised"
                    :class="{ active: model === option.value }"
                    @click="selectOption(option.value)"
                >
                    {{ option.label }}
                </button>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
const model = defineModel<'newest' | 'oldest' | 'name-asc' | 'name-desc'>({
    default: 'newest'
})

const isOpen = ref(false)

const options = [
    {
        label: 'Newest first',
        value: 'newest'
    },
    {
        label: 'Oldest first',
        value: 'oldest'
    },
    {
        label: 'Name A-Z',
        value: 'name-asc'
    },
    {
        label: 'Name Z-A',
        value: 'name-desc'
    }
] as const

const currentLabel = computed(() => {
    return options.find(option => option.value === model.value)?.label
})

const selectOption = (value: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => {
    model.value = value
    isOpen.value = false
}
</script>
