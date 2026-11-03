<script setup lang="ts">
import { activityActions, type ActivityEntry, type ActivityPage } from '~~/shared/types/activity'
definePageMeta({ layout: 'user', middleware: 'auth' })
const search = ref(''), type = ref(''), action = ref(''), from = ref(''), to = ref('')
const items = ref<ActivityEntry[]>([]), cursor = ref<string | null>(null), loading = ref(false), error = ref('')
let generation = 0, timer: ReturnType<typeof setTimeout> | undefined
const load = async (more = false) => {
    clearTimeout(timer)
    const current = ++generation
    loading.value = true; error.value = ''
    try {
        const until = to.value ? new Date(to.value + 'T00:00:00') : null
        if (until) until.setDate(until.getDate() + 1)
        const result = await $fetch<ActivityPage>('/api/activity', { query: { q: search.value || undefined, type: type.value || undefined, action: action.value || undefined, from: from.value ? new Date(from.value + 'T00:00:00').toISOString() : undefined, to: until?.toISOString(), cursor: more ? cursor.value ?? undefined : undefined } })
        if (generation !== current) return
        items.value = more ? [...items.value, ...result.items] : result.items; cursor.value = result.nextCursor
    } catch (err: any) { if (generation === current) error.value = err.data?.message || 'Could not load activity history.' }
    finally { if (generation === current) loading.value = false }
}
watch([search,type,action,from,to], () => { ++generation; clearTimeout(timer); items.value = []; cursor.value = null; timer = setTimeout(() => load(), 300) })
onMounted(() => load())
onBeforeUnmount(() => { ++generation; clearTimeout(timer) })
const clear = () => { search.value = ''; type.value = ''; action.value = ''; from.value = ''; to.value = '' }
</script>
<template>
    <div class="flex min-h-0 flex-1 flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <label class="min-w-0 flex-1"><span class="sr-only">Search activity</span><input v-model="search" type="search" maxlength="120" placeholder="Search names…" class="history-input w-full min-w-0" /></label>
            <button type="button" class="inbox-button" :disabled="loading" @click="load()"><Icon name="solar:refresh-linear" />Refresh</button>
        </div>
        <div class="flex flex-wrap items-end gap-2 rounded-xl border border-divider bg-surface p-3">
            <label class="flex min-w-0 flex-col gap-1 text-xs text-muted">Type<select v-model="type" aria-label="Type" class="history-input"><option value="">All types</option><option v-for="kind in ['file','folder','note','inbox','batch']" :key="kind" :value="kind">{{ kind[0]!.toUpperCase() + kind.slice(1) }}</option></select></label>
            <label class="flex min-w-0 flex-col gap-1 text-xs text-muted">Action<select v-model="action" aria-label="Action" class="history-input max-w-56"><option value="">All actions</option><option v-for="(label,key) in activityActions" :key="key" :value="key">{{ label }}</option></select></label>
            <label class="flex min-w-0 flex-col gap-1 text-xs text-muted">From<input v-model="from" type="date" class="history-input" /></label><label class="flex min-w-0 flex-col gap-1 text-xs text-muted">To<input v-model="to" type="date" class="history-input" /></label>
            <button type="button" class="inbox-button" @click="clear">Clear filters</button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto rounded-xl border border-divider bg-surface p-4">
            <p class="mb-4 mt-0 text-xs leading-5 text-muted">Successful changes are recorded from when activity history was enabled. Deleted item names remain in your history.</p>
            <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p><p v-if="loading && !items.length" role="status" class="text-sm text-muted">Loading activity…</p><p v-else-if="!items.length && !error" class="p-6 text-center text-sm text-muted">No activity matches these filters.</p>
            <ol class="m-0 list-none p-0"><li v-for="item in items" :key="item.id" class="flex min-w-0 gap-3 border-b border-divider py-4 first:pt-0 last:border-0"><Icon :name="item.type === 'note' ? 'solar:notebook-linear' : item.type === 'folder' ? 'solar:folder-linear' : 'solar:document-linear'" class="mt-1 shrink-0 text-xl text-accent" /><div class="min-w-0 flex-1"><div class="flex flex-wrap justify-between gap-2"><strong class="text-sm text-foreground">{{ activityActions[item.action] ?? item.action }}</strong><time :datetime="item.createdAt" class="text-xs text-muted">{{ new Date(item.createdAt).toLocaleString() }}</time></div><p class="mb-0 mt-1 break-all text-sm text-content">{{ item.name }}</p><p v-if="item.previousName" class="mb-0 mt-1 break-all text-xs text-muted">Previously: {{ item.previousName }}</p><p v-if="item.location" class="mb-0 mt-1 break-all text-xs text-muted">Destination: {{ item.location }}</p><span class="mt-2 inline-block rounded bg-control px-2 py-1 text-[0.7rem] text-muted">{{ item.type }}</span></div></li></ol>
            <button v-if="cursor" type="button" class="inbox-button mx-auto mt-4" :disabled="loading" @click="load(true)">Load more</button>
        </div>
    </div>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";
.history-input { @apply min-h-10 max-w-full rounded-lg border border-control-border bg-input px-3 py-2 text-sm text-content outline-none focus:border-accent; }
</style>
