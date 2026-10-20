<template>
    <div class="sort-dropdown">
        <button
            type="button"
            class="sort-trigger"
            @click="isOpen = !isOpen"
        >
            <Icon name="solar:sort-vertical-linear" class="sort-icon" aria-hidden="true" />

            <span>{{ currentLabel }}</span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="arrow-icon"
                aria-hidden="true"
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

const selectOption = (value: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => {
    model.value = value
    isOpen.value = false
}
</script>

<style scoped>
.sort-dropdown {
    position: relative;
    flex-shrink: 0;
}

.sort-trigger {
    height: var(--ui-control-height, 2.5rem);

    padding: 0 0.75rem;

    display: flex;
    align-items: center;

    gap: 0.5rem;

    color: #a8a8b0;

    background: transparent;

    border: none;
    border-radius: var(--ui-control-radius, 8px);

    font-family: 'Inter', sans-serif;
    font-size: var(--ui-control-font-size, 0.875rem);
    white-space: nowrap;

    cursor: pointer;
    font-weight: 500;
    line-height: 1.5;
    box-sizing: border-box;
}

.sort-trigger:hover {
    color: #ffffff;

    background: #1f1f23;
}

.sort-icon,
.arrow-icon {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    font-size: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
}

.sort-menu {
    position: absolute;

    top: calc(100% + 0.5rem);
    right: 0;

    width: 10rem;

    padding: 3px;

    display: flex;
    flex-direction: column;

    background: #1f1f23;

    border: 1px solid #303036;
    border-radius: var(--ui-menu-radius, 12px);
    box-sizing: border-box;

    box-shadow: 0 0.6rem 2rem rgba(0, 0, 0, 0.35);

    z-index: 50;
}

.sort-option {
    width: 100%;

    padding: 0.5rem 0.75rem;

    color: #a8a8b0;

    background: transparent;

    border: none;
    border-radius: var(--ui-control-radius, 8px);

    font-family: 'Inter', sans-serif;
    font-size: var(--ui-control-font-size, 0.875rem);

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
