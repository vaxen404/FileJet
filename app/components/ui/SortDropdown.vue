<template>
    <div class="sort-dropdown relative shrink-0">
        <button
            type="button"
            class="sort-trigger h-10 max-mobile:h-11 pointer-coarse:h-11 py-0 px-3 flex items-center gap-2 text-label
                bg-transparent border-0 rounded-lg text-sm whitespace-nowrap cursor-pointer font-medium
                leading-normal hover:text-foreground hover:bg-surface-hover"
            @click="isOpen = !isOpen"
        >
            <Icon
                name="solar:sort-vertical-linear"
                class="block text-lg shrink-0 size-4.5"
            />

            <span>{{ currentLabel }}</span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="block text-lg shrink-0 size-4.5 transition-transform duration-150"
                :class="{ 'rotate-180': isOpen }"
            />
        </button>

        <Transition name="dropdown">
            <div
                v-if="isOpen"
                class="sort-menu absolute top-full mt-2 right-0 w-40 p-0.75 flex flex-col bg-surface-hover border
                    border-control-border rounded-xl shadow-[0_0.6rem_2rem_rgba(0,_0,_0,_0.35)] z-50"
            >
                <button
                    v-for="option in options"
                    :key="option.value"
                    type="button"
                    class="sort-option w-full py-2 px-3 text-label bg-transparent border-0 rounded-lg text-sm text-left
                        cursor-pointer font-medium leading-normal hover:text-foreground hover:bg-raised
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
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Name A-Z', value: 'name-asc' },
    { label: 'Name Z-A', value: 'name-desc' }
] as const

const currentLabel = computed(() => options.find(option => option.value === model.value)?.label)

const selectOption = (value: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => {
    model.value = value
    isOpen.value = false
}
</script>
