<template>
    <div
        v-if="totalPages > 0"
        aria-label="Pagination"
        class="pagination h-14 shrink-0 flex items-center justify-center gap-1 bg-surface border border-divider
        border-t-0 rounded-bl-panel rounded-br-panel grid-pagination:bg-transparent grid-pagination:border-0
        grid-pagination:rounded-none grid-pagination:mt-3"
        :class="{ 'grid-pagination': viewMode === 'grid' }"
    >
        <button
            type="button"
            class="page-button flex items-center justify-center bg-transparent text-label border border-divider
            rounded-control cursor-pointer text-control-size font-medium leading-normal hover:enabled:bg-raised
            hover:enabled:text-foreground disabled:opacity-35 disabled:cursor-not-allowed size-[2.2rem]"
            aria-label="Previous page"
            :disabled="modelValue === 1"
            @click="previousPage"
        >
            <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:alt-arrow-left-linear" />
        </button>

        <template
            v-for="(page, index) in visiblePages"
            :key="index"
        >
            <span
                v-if="page === '...'"
                class="page-dots text-muted py-0 px-[0.3rem]"
            >
                ...
            </span>

            <button
                v-else
                type="button"
                class="page-button flex items-center justify-center bg-transparent text-label border border-divider
                rounded-control cursor-pointer text-control-size font-medium leading-normal hover:enabled:bg-raised
                hover:enabled:text-foreground is-active:bg-primary is-active:text-on-primary is-active:border-primary
                disabled:opacity-35 disabled:cursor-not-allowed size-[2.2rem] is-active:hover:bg-primary is-active:hover:text-on-primary"
                :class="{ active: modelValue === page }"
                :aria-current="modelValue === page ? 'page' : undefined"
                :aria-label="`Page ${page}`"
                @click="goToPage(Number(page))"
            >
                {{ page }}
            </button>
        </template>

        <button
            type="button"
            class="page-button flex items-center justify-center bg-transparent text-label border border-divider
            rounded-control cursor-pointer text-control-size font-medium leading-normal hover:enabled:bg-raised
            hover:enabled:text-foreground disabled:opacity-35 disabled:cursor-not-allowed size-[2.2rem]"
            aria-label="Next page"
            :disabled="modelValue === totalPages"
            @click="nextPage"
        >
            <Icon class="block text-control-icon shrink-0 size-control-icon" name="solar:alt-arrow-right-linear" />
        </button>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        modelValue: number
        totalPages: number
        viewMode?: 'list' | 'grid'
    }>(),
    {
        viewMode: 'list'
    }
)

const emit = defineEmits<{
    'update:modelValue': [value: number]
}>()

const visiblePages = computed(() => {
    const total = props.totalPages
    const current = props.modelValue

    if (total <= 4) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    if (current <= 3) {
        return [1, 2, 3, 4, '...']
    }

    if (current >= total - 2) {
        return ['...', total - 3, total - 2, total - 1, total]
    }

    return ['...', current - 1, current, current + 1, '...']
})

const previousPage = () => {
    if (props.modelValue > 1) {
        emit('update:modelValue', props.modelValue - 1)
    }
}

const nextPage = () => {
    if (props.modelValue < props.totalPages) {
        emit('update:modelValue', props.modelValue + 1)
    }
}

const goToPage = (page: number) => {
    emit('update:modelValue', page)
}
</script>
