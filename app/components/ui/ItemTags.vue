<template>
    <div v-if="tags?.length" class="item-tags flex min-w-0 gap-1" :class="overlay ? 'flex-nowrap overflow-hidden' : 'mt-1 flex-wrap'" aria-label="Tags">
        <span v-for="tag in tags.slice(0, 3)" :key="tag" class="min-w-0 max-w-28 truncate rounded-full border px-2 py-0.5 text-[0.65rem] font-medium leading-4" :class="overlay ? 'border-white/10 bg-black/50 text-white/75 backdrop-blur-sm' : 'border-divider bg-control/50 text-label'" :title="tag">{{ overlay ? '#' + tag : tag }}</span>
        <span v-if="tags.length > 3" class="shrink-0 self-center text-[0.65rem]" :class="overlay ? 'rounded-full bg-black/50 px-1.5 py-0.5 text-white/75 backdrop-blur-sm' : 'text-muted'" :title="tags.slice(3).join(', ')">+{{ tags.length - 3 }}</span>
    </div>
</template>
<script setup lang="ts">defineProps<{ tags?: string[]; overlay?: boolean }>()</script>
