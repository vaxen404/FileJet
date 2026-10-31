<template>
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <SearchBox v-model="search" placeholder="Search inboxes…" aria-label="Search inboxes" class="min-w-0 max-w-128 flex-1 max-tablet:max-w-none" />
            <div class="flex items-center gap-2 max-mobile:w-full">
                <button type="button" class="inbox-button" :disabled="loading" @click="load"><Icon name="solar:refresh-linear" :class="{ 'animate-spin': loading }" />Refresh</button>
                <button type="button" class="inbox-button inbox-primary max-mobile:flex-1" @click="formOpen = true"><Icon name="solar:add-circle-linear" size="19" />Create inbox</button>
            </div>
        </div>
        <p v-if="loading" role="status" class="p-6 text-center text-sm text-muted">Loading inboxes…</p>
        <div v-else-if="loadError" role="alert" class="rounded-xl border border-divider bg-surface p-8 text-center">
            <p class="text-sm text-danger">{{ loadError }}</p><button class="inbox-button mt-4" @click="load">Try again</button>
        </div>
        <div v-else-if="!filteredRequests.length" class="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-divider p-6 text-center">
            <Icon name="solar:inbox-in-linear" size="38" class="text-accent" />
            <h2 class="font-semibold text-foreground">{{ search ? 'No matching inboxes' : 'Create your first inbox' }}</h2>
            <p class="max-w-96 text-sm leading-6 text-muted">{{ search ? 'Try another search.' : 'Give your inbox a name, share its link, and open it to see the files people send.' }}</p>
            <button v-if="!search" class="inbox-button inbox-primary mt-2" @click="formOpen = true">Create inbox</button>
        </div>
        <div v-else class="grid grid-cols-3 gap-4 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
            <NuxtLink
                v-for="item in filteredRequests" :key="item.id" :to="`/inbox/${item.id}`" :aria-label="`Open inbox ${item.title}`"
                class="group flex min-w-0 flex-col gap-4 rounded-xl border border-divider bg-surface p-5 no-underline hover:border-accent/50 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
                <div class="flex items-center justify-between gap-3">
                    <span class="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="solar:inbox-in-linear" size="25" /></span>
                    <span class="rounded-md px-2 py-1 text-xs" :class="getInboxStatus(item, now) === 'Open' ? 'bg-accent/10 text-accent' : 'bg-control text-muted'">{{ getInboxStatus(item, now) }}</span>
                </div>
                <div class="min-w-0"><h2 class="truncate font-semibold text-foreground" :title="item.title">{{ item.title }}</h2><p v-if="item.description" class="mt-2 line-clamp-2 text-sm leading-6 text-muted">{{ item.description }}</p></div>
                <div class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3 text-xs text-muted"><span>{{ item.receivedCount }} {{ item.receivedCount === 1 ? 'file received' : 'files received' }}</span><span v-if="item.pendingCount" class="rounded-md bg-warning/10 px-2 py-1 text-warning">{{ item.pendingCount }} pending</span><Icon name="solar:arrow-right-linear" size="19" class="text-accent" /></div>
            </NuxtLink>
        </div>
        <ClientOnly><FileRequestForm :open="formOpen" @close="formOpen = false" @saved="created" /></ClientOnly>
    </div>
</template>

<script setup lang="ts">
import type { FileRequestItem } from '~~/shared/types/inbox'
import FileRequestForm from '~/components/inbox/FileRequestForm.vue'
import { getInboxStatus } from '~/utils/inbox'

definePageMeta({ middleware: 'auth', layout: 'user' })
useHead({ title: 'Inbox · FileJet' })
const requests = ref<FileRequestItem[]>([])
const search = ref(''), loadError = ref('')
const formOpen = ref(false), loading = ref(true), now = ref(Date.now())
const { openToast } = useToast()
const filteredRequests = computed(() => requests.value.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(search.value.toLowerCase())))
const load = async () => {
    loading.value = true; loadError.value = ''
    try {
        const result = await $fetch<{ requests: FileRequestItem[] }>('/api/inbox')
        requests.value = result.requests; now.value = Date.now()
    } catch (error: any) { loadError.value = error.data?.message || 'Could not load inboxes.' }
    finally { loading.value = false }
}
const created = async () => { openToast('Inbox created. Open it to share its link and view incoming files.', 'success'); search.value = ''; await load() }
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void load(); timer = setInterval(() => { now.value = Date.now() }, 30000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
