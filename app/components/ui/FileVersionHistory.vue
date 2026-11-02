<template>
    <section class="rounded-xl border border-divider bg-surface p-4">
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-semibold text-foreground">Version history</h2><span class="text-xs text-muted">Current: v{{ history?.revision ?? revision }}</span></div>
        <p class="mt-2 text-xs leading-5 text-muted">Add an updated file with the same extension. The filename and sharing links stay the same. Saved versions count toward your storage.</p>
        <input ref="input" type="file" class="hidden" :accept="extension" :disabled="busy" @change="replace">
        <div class="mt-3 flex flex-wrap gap-2"><button type="button" class="inbox-button" :disabled="busy || loading" @click="input?.click()"><Icon name="solar:upload-linear" />{{ busy ? 'Working…' : 'Upload new version' }}</button><button type="button" class="inbox-button" :disabled="busy" @click="load">Refresh</button></div>
        <progress v-if="busy" :value="progress" max="100" class="mt-3 h-2 w-full accent-accent" />
        <p v-if="errorMessage" role="alert" class="mt-3 text-sm text-danger">{{ errorMessage }}</p>
        <p v-if="loading" role="status" class="mt-3 text-sm text-muted">Loading versions…</p>
        <p v-else-if="!history?.versions.length" class="mt-3 text-sm text-muted">No earlier versions yet.</p>
        <ol v-else class="mt-4 flex flex-col gap-3"><li v-for="version in history.versions" :key="version.id" class="border-t border-divider pt-3">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>Version {{ version.revision }}</strong><span class="text-xs text-muted">{{ formatFileSize(version.size) }}</span></div>
            <p class="mt-1 truncate text-xs text-muted" :title="version.name">{{ version.name }} · {{ new Date(version.createdAt).toLocaleString() }}</p>
            <div class="mt-2 flex flex-wrap gap-2"><a :href="`${base}/${version.id}/download`" class="inbox-button" download>Download</a><button type="button" class="inbox-button" :disabled="busy" @click="restore(version)">Restore</button><button type="button" class="inbox-button text-danger!" :disabled="busy" @click="remove(version)">Delete</button></div>
        </li></ol>
    </section>
</template>
<script setup lang="ts">
import type { FileHistory, FileVersion } from '~~/shared/types/fileVersion'
import { formatFileSize } from '~/utils/file'
import { uploadResumably } from '~/utils/resumableUpload'
const props = defineProps<{ fileId: string; revision: number; name: string }>()
const emit = defineEmits<{ changed: [] }>()
const currentUser = useAuthUser(), { confirm } = useConfirm()
const history = ref<FileHistory | null>(null), loading = ref(false), busy = ref(false), progress = ref(0), errorMessage = ref('')
const input = ref<HTMLInputElement | null>(null)
const base = computed(() => `/api/files/${encodeURIComponent(props.fileId)}/versions`)
const extension = computed(() => props.name.includes('.') ? '.' + props.name.split('.').pop() : undefined)
const load = async () => {
    loading.value = true; errorMessage.value = ''
    try { history.value = await $fetch<FileHistory>(base.value) }
    catch (error: any) { errorMessage.value = error.data?.message || 'Could not load version history.' }
    finally { loading.value = false }
}
const work = async (fn: () => Promise<unknown>) => {
    if (busy.value) return
    busy.value = true; errorMessage.value = ''; progress.value = 0
    try { await fn(); await load(); emit('changed') }
    catch (error: any) { errorMessage.value = error.data?.message || error.message || 'Could not update this file.' }
    finally { busy.value = false }
}
const replace = async (event: Event) => {
    const target = event.target as HTMLInputElement, file = target.files?.[0]; target.value = ''
    if (!file || !currentUser.value) return
    await work(() => uploadResumably([file], { kind: 'files', scope: currentUser.value!.id, label: 'File version', replaceFileId: props.fileId, expectedRevision: history.value?.revision ?? props.revision, onProgress: (loaded, total) => { progress.value = total ? Math.floor(loaded / total * 100) : 0 } }))
}
const restore = async (version: FileVersion) => {
    if (!await confirm({ title: `Restore version ${version.revision}?`, message: 'The current contents will be saved as another version. Restoring uses storage for a new copy.', confirmText: 'Restore version' })) return
    await work(() => $fetch<{ success: boolean }>(`${base.value}/${version.id}/restore`, { method: 'POST', body: { revision: history.value?.revision ?? props.revision } }))
}
const remove = async (version: FileVersion) => {
    if (!await confirm({ title: `Delete version ${version.revision}?`, message: 'This saved version will be permanently removed and its storage released. The current file stays available.', confirmText: 'Delete version', variant: 'danger' })) return
    await work(() => $fetch<{ success: boolean }>(`${base.value}/${version.id}`, { method: 'DELETE' }))
}
onMounted(load)
watch(() => props.revision, load)
</script>
