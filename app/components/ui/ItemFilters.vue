<template>
    <div class="item-filters flex items-center flex-wrap gap-2 min-w-0">
        <button
            v-for="option in options"
            :key="option"
            type="button"
            class="filter-btn shrink-0 h-control py-0 px-3 text-label bg-surface border border-divider rounded-control
            text-control-size font-medium cursor-pointer transition-colors duration-200 ease-[ease]
            leading-normal hover:text-white hover:bg-raised hover:border-[#35353c] is-active:text-white
            is-active:bg-primary is-active:border-primary focus-visible:outline-2 focus-visible:outline-accent
            focus-visible:outline-offset-3"
            :class="{ active: model === option }"
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
