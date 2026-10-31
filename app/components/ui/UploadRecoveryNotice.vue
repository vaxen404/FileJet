<template>
    <aside v-if="waiting || (unfinished && !active)" role="status" class="fixed right-4 top-20 z-1000 w-80 max-w-[calc(100vw_-_2rem)] rounded-xl border border-divider bg-surface p-4 text-sm text-foreground shadow-xl">
        <p class="font-semibold">{{ waiting ? 'Connection interrupted' : 'Unfinished upload available' }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ waiting ? 'Waiting for the connection. Your upload will resume automatically.' : 'Select the same files and destination to continue where you left off. Unfinished uploads are kept for 24 hours.' }}</p>
        <button v-if="!active" type="button" class="mt-3 text-xs text-accent underline disabled:opacity-50" :disabled="discarding" @click="discard">{{ discarding ? 'Discarding…' : 'Discard unfinished uploads' }}</button>
        <p v-if="errorMessage" role="alert" class="mt-2 text-xs text-danger">{{ errorMessage }}</p>
    </aside>
</template>
<script setup lang="ts">
import { uploadJobs, unfinishedUploadCount, discardUnfinishedUploads } from '~/utils/resumableUpload'
const currentUser = useAuthUser(), route = useRoute()
const scope = computed(() => route.path.startsWith('/request/') ? `request:${String(route.params.token)}` : currentUser.value?.id ?? '')
const unfinished = ref(0)
const discarding = ref(false), errorMessage = ref('')
const jobs = computed(() => [...uploadJobs.values()].filter(job => job.scope === scope.value))
const active = computed(() => jobs.value.length > 0), waiting = computed(() => jobs.value.some(job => job.state === 'waiting'))
const refresh = () => { unfinished.value = scope.value ? unfinishedUploadCount(scope.value) : 0 }
const discard = async () => {
    discarding.value = true; errorMessage.value = ''
    try { await discardUnfinishedUploads(scope.value); refresh() }
    catch (error) { errorMessage.value = (error as Error).message }
    finally { discarding.value = false }
}
onMounted(() => { refresh(); window.addEventListener('filejet:uploads', refresh); window.addEventListener('storage', refresh) })
onBeforeUnmount(() => { window.removeEventListener('filejet:uploads', refresh); window.removeEventListener('storage', refresh) })
watch(scope, refresh)
</script>
