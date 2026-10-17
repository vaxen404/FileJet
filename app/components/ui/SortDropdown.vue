<template>
    <div class="sort-dropdown">
        <button
            type="button"
            class="sort-trigger"
            @click="isOpen = !isOpen"
        >
            <Icon name="solar:sort-vertical-linear" />

            <span>{{ currentLabel }}</span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="arrow-icon"
            />
        </button>

        <div
            v-if="isOpen"
            class="sort-menu"
        >
            <button
                v-for="option in options"
                :key="option.value"
                type="button"
                class="sort-option"
                :class="{ active: model === option.value }"
                @click="selectOption(option.value)"
            >
                {{ option.label }}
            </button>
        </div>
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

const selectOption = (
    value: 'newest' | 'oldest' | 'name-asc' | 'name-desc'
) => {
    model.value = value
    isOpen.value = false
}
</script>

<style scoped>
.sort-dropdown {
    position: relative;
}

.sort-trigger {
    height: 2.5rem;

    padding: 0 0.75rem;

    display: flex;
    align-items: center;

    gap: 0.5rem;

    color: #a8a8b0;

    background: transparent;

    border: none;
    border-radius: 6px;

    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;

    cursor: pointer;
    font-weight: 500;
    line-height: 1.5;
    box-sizing: border-box;
}

.sort-trigger:hover {
    color: #ffffff;

    background: #1f1f23;
}

.arrow-icon {
    font-size: 0.85rem;
}

.sort-menu {
    position: absolute;

    top: calc(100% + 0.5rem);
    right: 0;

    width: 10rem;

    padding: 0.25rem;

    display: flex;
    flex-direction: column;

    background: #1f1f23;

    border: 1px solid #303036;
    border-radius: 24px;

    box-shadow: 0 0.6rem 2rem rgba(0, 0, 0, 0.35);

    z-index: 50;
}

.sort-option {
    width: 100%;

    padding: 0.5rem 0.75rem;

    color: #a8a8b0;

    background: transparent;

    border: none;
    border-radius: 6px;

    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;

    text-align: left;

    cursor: pointer;
    font-weight: 500;
    line-height: 1.5;
}

.sort-option:hover,
.sort-option.active {
    color: #ffffff;

    background: #2a2a2f;
}
</style>