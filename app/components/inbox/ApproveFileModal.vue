<template>
    <Teleport to="body">
        <dialog ref="dialog" aria-labelledby="approve-file-title" class="approve-dialog" @cancel.prevent="close" @click.self="close" @close="emit('close')">
            <form class="flex flex-col gap-4 p-6" @submit.prevent="save">
                <h2 id="approve-file-title" class="text-lg font-semibold text-foreground">{{ uploads.length > 1 ? `Approve & save ${uploads.length} files` : 'Approve & save file' }}</h2>
                <ul aria-label="Files to approve" class="text-sm leading-6 text-foreground"><li v-for="file in uploads.slice(0, 3)" :key="file.id" class="truncate">{{ file.name }}</li><li v-if="uploads.length > 3" class="text-muted">and {{ uploads.length - 3 }} more files</li></ul>
                <label class="flex flex-col gap-2 text-sm text-label">Save to FileJet folder
                    <select v-model="folderId" v-memo="[folderOptions, folderId, loadingFolders]" :disabled="loadingFolders || saving" class="inbox-input"><option value="">Files (root)</option><option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">{{ folder.label }}</option></select>
                </label>
                <p class="text-xs leading-5 text-muted">Choose a folder from your FileJet library, or Files (root). {{ uploads.length > 1 ? 'All selected files are saved to this destination together.' : 'The file is saved there after you approve it.' }}</p>
                <p v-if="folderError" role="alert" class="text-sm text-danger">{{ folderError }} <button type="button" class="underline" @click="loadFolders">Try again</button></p>
                <p v-if="errorMessage" role="alert" class="text-sm text-danger">{{ errorMessage }}</p>
                <div class="flex justify-end gap-2"><button type="button" class="inbox-button" :disabled="saving" @click="close">Cancel</button><button type="submit" class="inbox-button inbox-primary" :disabled="saving || loadingFolders || !!folderError">{{ saving ? 'Saving…' : 'Approve & save' }}</button></div>
            </form>
        </dialog>
    </Teleport>
</template>
<script setup lang="ts">
import type { ReceivedFile } from '~~/shared/types/inbox'
const props = defineProps<{ requestId: string; uploads: ReceivedFile[]; defaultFolderId: string | null }>()
const emit = defineEmits<{ close: []; saved: [count: number] }>()
const dialog = ref<HTMLDialogElement | null>(null), folderId = ref(''), saving = ref(false), errorMessage = ref('')
const { folders, folderOptions, loadingFolders, folderError, loadFolders } = useInboxFolders()
const close = () => { if (!saving.value) emit('close') }
watch(() => props.uploads, async uploads => {
    if (!uploads.length) { dialog.value?.close(); return }
    folderId.value = props.defaultFolderId ?? ''; errorMessage.value = ''
    await nextTick()
    if (props.uploads !== uploads || !dialog.value?.isConnected) return
    if (!dialog.value.open) dialog.value.showModal()
    await loadFolders()
    if (folderId.value && !folders.value.some(folder => folder.id === folderId.value)) folderId.value = ''
}, { flush: 'post' })
const save = async () => {
    if (!props.uploads.length || saving.value || loadingFolders.value || folderError.value) return
    saving.value = true; errorMessage.value = ''
    try {
        const uploads = props.uploads
        if (uploads.length === 1) await $fetch(`/api/inbox/${props.requestId}/uploads/${uploads[0]!.id}/approve`, { method: 'POST', body: { folderId: folderId.value || null } })
        else await $fetch(`/api/inbox/${props.requestId}/uploads/bulk-approve`, { method: 'POST', body: { folderId: folderId.value || null, uploadIds: uploads.map(file => file.id) } })
        emit('saved', uploads.length); emit('close')
    } catch (error: any) { errorMessage.value = error.data?.message || 'Could not approve the selected files.' }
    finally { saving.value = false }
}
</script>
<style scoped>
.approve-dialog { margin: auto; width: min(30rem, calc(100% - 2rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 0; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); }
.approve-dialog::backdrop { background: #0009; }
</style>
