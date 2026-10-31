<template><label class="inline-flex min-w-0 items-center gap-2 text-sm text-muted"><span class="sr-only">Filter by tag</span><select v-model="model" aria-label="Filter by tag" class="h-10 max-w-48 min-w-0 rounded-lg border border-divider bg-surface px-3 text-sm text-content"><option value="">All tags</option><option v-for="tag in options" :key="tag.key" :value="tag.key">#{{ tag.name }}</option></select></label></template>
<script setup lang="ts">
const props = defineProps<{ items: { tags?: string[] }[] }>()
const model = defineModel<string>({ default: '' })
const options = computed(() => {
    const tags = new Map<string, string>()
    for (const item of props.items) for (const tag of item.tags ?? []) tags.set(tag.toLowerCase(), tag)
    return [...tags].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name))
})
watch(options, values => { if (model.value && !values.some(tag => tag.key === model.value)) model.value = '' })
</script>
