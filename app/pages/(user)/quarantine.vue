<script setup lang="ts">
import type { QuarantineEntry, QuarantinePage } from '~~/shared/types/quarantine'
definePageMeta({ layout: 'user', middleware: 'auth' })
const { confirm } = useConfirm(), { openToast } = useToast()
const filter = ref<'infected' | 'error'>('infected'), busy = ref(''), loading = ref(false), loadError = ref('')
const items = ref<QuarantineEntry[]>([]), nextCursor = ref<string | null>(null)
let generation = 0
const load = async (more = false) => {
    const current = ++generation
    loading.value = true; loadError.value = ''
    try {
        const result = await $fetch<QuarantinePage>('/api/quarantine', { query: { status: filter.value, ...(more && nextCursor.value ? { cursor: nextCursor.value } : {}) } })
        if (generation !== current) return
        items.value = more ? [...items.value, ...result.items] : result.items; nextCursor.value = result.nextCursor
    } catch (error: any) { if (generation === current) loadError.value = error.data?.message || 'Could not load quarantine.' }
    finally { if (generation === current) loading.value = false }
}
const scan = async (item: QuarantineEntry) => {
    if (busy.value) return
    busy.value = item.id
    try {
        const result = await $fetch(`/api/quarantine/${item.id}/scan`, { method: 'POST', timeout: 330000 })
        openToast(result.status === 'clean' ? 'No threat found. File access restored.' : result.status === 'infected' ? 'Threat still detected. File remains quarantined.' : 'Scan incomplete. Access remains blocked.', result.status === 'clean' ? 'success' : 'error')
        await load()
    } catch (error: any) { openToast(error.data?.message || 'Could not scan file.', 'error') }
    finally { busy.value = '' }
}
const remove = async (item: QuarantineEntry) => {
    if (busy.value || !await confirm({ title: `${item.deleteLabel}?`, message: item.kind === 'file' ? `“${item.name}” will move to Trash and remain blocked.` : `“${item.name}” will be removed. This cannot be undone.`, confirmText: item.deleteLabel, variant: 'danger' })) return
    busy.value = item.id
    try { await $fetch(item.deleteUrl, { method: item.kind === 'inbox' ? 'POST' : 'DELETE' }); await load(); openToast('Quarantine updated.', 'success') }
    catch (error: any) { openToast(error.data?.message || 'Could not remove item.', 'error') }
    finally { busy.value = '' }
}
watch(filter, () => { items.value = []; nextCursor.value = null; void load() })
onMounted(() => load())
</script>
<template>
    <div class="flex min-h-0 flex-1 flex-col gap-3">
        <div class="rounded-xl border border-divider bg-surface p-4 text-sm text-content">
            <h2 class="m-0 flex items-center gap-2 font-semibold text-foreground"><Icon name="solar:shield-warning-linear" class="text-xl text-danger" />Quarantine</h2>
            <p class="mb-0 mt-2 leading-6">Threats stay blocked from previews, downloads and shared links. Scan again after a signature update or remove the file.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="inbox-button" :aria-pressed="filter === 'infected'" :class="{ 'bg-primary! text-on-primary!': filter === 'infected' }" :disabled="!!busy" @click="filter = 'infected'">Threats</button>
            <button type="button" class="inbox-button" :aria-pressed="filter === 'error'" :class="{ 'bg-primary! text-on-primary!': filter === 'error' }" :disabled="!!busy" @click="filter = 'error'">Scan issues</button>
            <button type="button" class="inbox-button ml-auto" :disabled="loading || !!busy" @click="load()"><Icon name="solar:refresh-linear" />Refresh</button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto rounded-xl border border-divider bg-surface p-3">
            <p v-if="loadError" role="alert" class="p-3 text-sm text-danger">{{ loadError }}</p>
            <p v-if="loading && !items.length" role="status" class="p-3 text-sm text-muted">Loading quarantine…</p>
            <p v-else-if="!items.length && !loadError" class="p-6 text-center text-sm text-muted">{{ filter === 'infected' ? 'No quarantined threats.' : 'No files with scan issues.' }}</p>
            <ul class="m-0 flex list-none flex-col gap-3 p-0">
                <li v-for="item in items" :key="item.id" class="min-w-0 rounded-xl border border-divider p-4">
                    <div class="flex flex-wrap justify-between gap-3"><div class="min-w-0"><h3 class="m-0 break-all text-sm font-semibold text-foreground">{{ item.name }}</h3><p class="mb-0 mt-1 text-xs text-muted">{{ item.location }} · {{ Number(item.size).toLocaleString() }} bytes</p></div><span class="text-xs font-medium text-danger">{{ item.status === 'infected' ? 'Quarantined' : 'Access blocked' }}</span></div>
                    <p v-if="item.threat" class="mb-0 mt-3 break-all text-sm text-danger">{{ item.threat }}</p>
                    <p v-if="item.message" class="mb-0 mt-2 text-xs leading-5 text-muted">{{ item.message }}</p>
                    <p v-if="item.checkedAt" class="mb-0 mt-2 text-xs text-muted">Last scan: {{ new Date(item.checkedAt).toLocaleString() }}</p>
                    <div class="mt-3 flex flex-wrap gap-2"><NuxtLink v-if="item.href" :to="item.href" class="inbox-button no-underline">Details</NuxtLink><button type="button" class="inbox-button" :disabled="!!busy" @click="scan(item)">{{ busy === item.id ? 'Working…' : 'Scan again' }}</button><button type="button" class="inbox-button text-danger!" :disabled="!!busy" @click="remove(item)">{{ item.deleteLabel }}</button></div>
                </li>
            </ul>
            <button v-if="nextCursor" type="button" class="inbox-button mx-auto mt-4" :disabled="loading || !!busy" @click="load(true)">Load more</button>
        </div>
    </div>
</template>
