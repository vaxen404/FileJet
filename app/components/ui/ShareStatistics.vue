<template>
    <section class="mt-4 border-t border-divider pt-4">
        <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold text-foreground">Sharing statistics</h3><button type="button" class="text-xs text-accent underline" :disabled="loading" @click="load">{{ loading ? 'Loading…' : 'Refresh' }}</button></div>
        <p v-if="errorMessage" role="alert" class="mt-3 text-xs text-danger">{{ errorMessage }}</p>
        <template v-if="stats">
            <dl class="mt-3 grid grid-cols-2 gap-3"><div class="rounded-lg border border-divider p-3"><dt class="text-xs text-muted">Views</dt><dd class="mt-1 text-xl font-semibold text-foreground" data-stat="views">{{ count(stats.views) }}</dd></div><div class="rounded-lg border border-divider p-3"><dt class="text-xs text-muted">Downloads</dt><dd class="mt-1 text-xl font-semibold text-foreground" data-stat="downloads">{{ count(stats.downloads) }}</dd></div></dl>
            <p class="mt-3 text-xs leading-5 text-muted">Your own visits are excluded. Repeat views within 30 minutes and repeat downloads of the same item within a minute count once. Downloads count starts, not completed saves.</p>
            <p v-if="stats.lastViewedAt" class="mt-2 text-xs text-muted">Last viewed {{ new Date(stats.lastViewedAt).toLocaleString() }}</p>
            <details class="mt-3 text-xs"><summary class="cursor-pointer text-label">Daily totals · last 30 days (UTC)</summary><p v-if="!stats.daily.length" class="mt-3 text-muted">No activity yet.</p><table v-else class="mt-3 w-full text-left"><thead class="text-muted"><tr><th class="py-2">Date</th><th>Views</th><th>Downloads</th></tr></thead><tbody><tr v-for="day in stats.daily" :key="day.day" class="border-t border-divider text-content"><td class="py-2">{{ day.day }}</td><td>{{ count(day.views) }}</td><td>{{ count(day.downloads) }}</td></tr></tbody></table></details>
        </template>
    </section>
</template>
<script setup lang="ts">
import type { SharedItemType } from '~~/shared/types/share'
import type { ShareStatistics } from '~~/shared/types/shareStatistics'
const props = defineProps<{ itemId: string; itemType: SharedItemType }>()
const stats = ref<ShareStatistics | null>(null), loading = ref(false), errorMessage = ref('')
const count = (value: string) => BigInt(value).toLocaleString()
const load = async () => {
    loading.value = true; errorMessage.value = ''
    try { stats.value = await $fetch<ShareStatistics>(`/api/shared/items/${props.itemType}/${props.itemId}/stats`) }
    catch (error: any) { errorMessage.value = error.data?.message || 'Could not load sharing statistics.' }
    finally { loading.value = false }
}
onMounted(load)
</script>
