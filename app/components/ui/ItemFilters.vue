<template>
    <div
        role="group"
        aria-label="Filter items"
        class="item-filters flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-divider bg-surface p-1"
    >
        <button
            v-for="option in options"
            :key="option"
            type="button"
            class="filter-btn h-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-3 py-0 text-[0.8125rem]
            font-medium leading-normal whitespace-nowrap text-label transition-colors duration-200
            hover:bg-raised hover:text-foreground is-active:bg-primary is-active:text-on-primary
            focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 is-active:hover:bg-primary is-active:hover:text-on-primary"
            :class="{ active: model === option }"
            :aria-pressed="model === option"
            @click="model = option"
        >
            {{ option }}
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    options: readonly string[]
}>()

const model = defineModel<string>({ required: true })
</script>
