<template>
    <section :class="embedded ? 'mt-4 border-t border-divider pt-4' : 'rounded-xl border border-divider bg-surface p-4'">
        <h2 class="font-semibold text-foreground">Tags</h2><p class="mt-2 text-xs text-muted">Organize this item with up to 12 tags. Tags are private to your account.</p>
        <ul class="mt-3 flex flex-wrap gap-2"><li v-for="tag in current" :key="tag" class="flex max-w-full items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs text-accent"><span class="truncate" :title="tag">#{{ tag }}</span><button type="button" :aria-label="`Remove tag ${tag}`" :disabled="saving" class="shrink-0 rounded p-1 hover:bg-accent/10" @click="save(current.filter(value => value !== tag))">×</button></li></ul>
        <form class="mt-3 flex gap-2" @submit.prevent="add"><input v-model="draft" type="text" maxlength="32" aria-label="New tag" placeholder="e.g. Work" class="inbox-input min-w-0 flex-1" :disabled="saving || current.length >= 12"><button type="submit" class="inbox-button" :disabled="saving || !draft.trim() || current.length >= 12">{{ saving ? 'Saving…' : 'Add' }}</button></form>
        <p v-if="errorMessage" role="alert" class="mt-2 text-xs text-danger">{{ errorMessage }}</p>
    </section>
</template>
<script setup lang="ts">
import { parseTags } from '~~/shared/utils/tags'
const props = defineProps<{ itemId: string; itemType: 'file' | 'folder' | 'note'; tags?: string[]; embedded?: boolean }>()
const emit = defineEmits<{ changed: [tags: string[]] }>()
const current = ref<string[]>([...(props.tags ?? [])]), draft = ref(''), saving = ref(false), errorMessage = ref('')
watch(() => props.tags, tags => { current.value = [...(tags ?? [])] })
const save = async (value: string[]) => {
    if (saving.value) return
    saving.value = true; errorMessage.value = ''
    try { const result = await $fetch<{ tags: string[] }>(`/api/items/${props.itemType}/${props.itemId}/tags`, { method: 'PATCH', body: { tags: parseTags(value) } }); current.value = result.tags; draft.value = ''; emit('changed', result.tags) }
    catch (error: any) { errorMessage.value = error.data?.message || error.message || 'Could not save tags.' }
    finally { saving.value = false }
}
const add = () => save([...current.value, draft.value])
</script>
