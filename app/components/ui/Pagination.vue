<template>
    <div
        v-if="totalPages > 0"
        class="pagination"
        :class="{ 'grid-pagination': viewMode === 'grid' }"
    >
        <button
            type="button"
            class="page-button"
            :disabled="modelValue === 1"
            @click="previousPage"
        >
            <Icon name="solar:alt-arrow-left-linear" />
        </button>

        <template
            v-for="(page, index) in visiblePages"
            :key="index"
        >
            <span
                v-if="page === '...'"
                class="page-dots"
            >
                ...
            </span>

            <button
                v-else
                type="button"
                class="page-button"
                :class="{ active: modelValue === page }"
                @click="goToPage(Number(page))"
            >
                {{ page }}
            </button>
        </template>

        <button
            type="button"
            class="page-button"
            :disabled="modelValue === totalPages"
            @click="nextPage"
        >
            <Icon name="solar:alt-arrow-right-linear" />
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

<style scoped>
.pagination {
    height: 3.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;

    background: #1a1a1d;
    border: 1px solid #29292e;
    border-top: none;

    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
}

.grid-pagination {
    background: transparent;
    border: none;
    border-radius: 0;
    margin-top: 0.75rem;
}

.page-button {
    width: 2.2rem;
    height: 2.2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    background: transparent;
    color: #a8a8b0;

    border: 1px solid #29292e;
    border-radius: 6px;

    cursor: pointer;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    line-height: 1.5;
}

.page-button:hover:not(:disabled) {
    background: #242429;
    color: #ffffff;
}

.page-button.active {
    background: #343c8f;
    color: #ffffff;
    border-color: #3c47be;
}

.page-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.page-dots {
    color: #898991;
    padding: 0 0.3rem;
}
</style>
