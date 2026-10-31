<template>
    <Teleport to="body">
        <dialog ref="dialog" aria-labelledby="request-form-title" class="request-dialog" @cancel.prevent="close" @pointerdown="onPointerDown" @click.self="onBackdropClick" @close="emit('close')">
            <form class="flex flex-col gap-4 p-6" @submit.prevent="save">
                <div class="flex items-start justify-between gap-4">
                    <div><h2 id="request-form-title" class="text-lg font-semibold text-foreground">{{ inbox ? 'Edit inbox' : 'Create inbox' }}</h2><p class="mt-1 text-sm text-muted">{{ inbox ? 'Update this inbox’s name and collection settings.' : 'Collect files and review them before saving.' }}</p></div>
                    <button type="button" class="inbox-icon" aria-label="Close" :disabled="saving" @click="close"><Icon name="solar:close-circle-linear" size="23" /></button>
                </div>
                <label class="request-field">Title<input ref="titleInput" v-model="title" required maxlength="120" placeholder="e.g. Project documents" class="inbox-input"></label>
                <label class="request-field">Description <span class="text-muted">(optional)</span><textarea v-model="description" maxlength="1000" rows="3" placeholder="Tell people what to send…" class="inbox-input resize-y" /></label>
                <label class="request-field">Default FileJet folder
                    <select v-model="folderId" v-memo="[folderOptions, folderId, loadingFolders]" class="inbox-input" :disabled="loadingFolders"><option value="">Files (root)</option><option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">{{ folder.label }}</option></select>
                </label>
                <p class="text-xs leading-5 text-muted">You can choose a different destination each time you approve a file.</p>
                <p v-if="folderError" role="alert" class="text-sm text-danger">{{ folderError }} <button type="button" class="underline" @click="loadFolders">Try again</button></p>
                <div class="grid grid-cols-2 gap-4 max-mobile:grid-cols-1">
                    <label class="request-field">Limit per file (MB)<input v-model.number="maxSize" type="number" required :min="1 / 1048576" max="25" step="any" class="inbox-input"></label>
                    <label class="request-field">Total file limit<input v-model.number="maxFiles" type="number" required :min="Math.max(1, inbox?.receivedCount ?? 1)" max="1000" step="1" class="inbox-input"></label>
                </div>
                <label class="request-field">Link expires<select v-model="expiryDays" class="inbox-input"><option v-if="inbox" :value="-1">{{ inbox.expiresAt ? `Keep current date (${new Date(inbox.expiresAt).toLocaleString()})` : 'Keep no expiration' }}</option><option :value="1">In 1 day</option><option :value="7">In 7 days</option><option :value="30">In 30 days</option><option :value="0">Never</option></select></label>
                <p class="rounded-lg border border-divider bg-canvas p-3 text-xs leading-5 text-muted">Incoming files stay in Inbox until you approve them. Pending files use your storage space. Anyone with the link can upload without seeing your files.</p>
                <p v-if="errorMessage" role="alert" class="text-sm text-danger">{{ errorMessage }}</p>
                <div v-if="draftStored" class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted" role="status"><span>{{ draftRestored ? 'Draft restored.' : 'Draft saved on this browser.' }}</span><button type="button" class="underline" :disabled="saving" @click="discardDraft">Discard draft</button></div>
                <div class="mt-1 flex justify-end gap-2"><button type="button" class="inbox-button" :disabled="saving" @click="close">Cancel</button><button type="submit" class="inbox-button inbox-primary" :disabled="saving || loadingFolders || !!folderError">{{ saving ? 'Saving…' : inbox ? 'Save changes' : 'Create inbox' }}</button></div>
            </form>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import type { FileRequestItem } from '~~/shared/types/inbox'
import { inboxDraftSchema, type InboxDraft } from '~~/shared/schemas/inboxDraft'
import { browserDraftStorage, readFormDraft, writeFormDraft } from '~/utils/formDraft'
const props = withDefaults(defineProps<{ open: boolean; inbox?: FileRequestItem | null }>(), { inbox: null })
const emit = defineEmits<{ close: []; saved: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const title = ref(''), description = ref(''), folderId = ref(''), errorMessage = ref('')
const maxSize = ref(10), maxFiles = ref(100), expiryDays = ref(7)
const saving = ref(false)
const currentUser = useAuthUser()
const draftKey = computed(() => currentUser.value ? `filejet:inbox-draft:${currentUser.value.id}:${props.inbox?.id ?? 'new'}` : '')
const draftStored = ref(false), draftRestored = ref(false)
let draftReady = false, originalDraft = ''
const draftValue = () => ({ title: title.value, description: description.value, folderId: folderId.value, maxSize: maxSize.value, maxFiles: maxFiles.value, expiryDays: expiryDays.value })
const applyDraft = (draft: InboxDraft) => {
    title.value = draft.title; description.value = draft.description; folderId.value = draft.folderId
    maxSize.value = draft.maxSize as number; maxFiles.value = draft.maxFiles as number; expiryDays.value = draft.expiryDays
}
const clearDraft = () => {
    if (import.meta.client && draftKey.value) writeFormDraft(browserDraftStorage(), draftKey.value, null)
    draftStored.value = false; draftRestored.value = false
}
const discardDraft = () => {
    draftReady = false
    applyDraft(JSON.parse(originalDraft)); clearDraft(); errorMessage.value = ''
    draftReady = true
}
watch([title, description, folderId, maxSize, maxFiles, expiryDays], () => {
    if (!import.meta.client || !props.open || !draftReady || !draftKey.value) return
    const value = draftValue()
    draftStored.value = writeFormDraft(browserDraftStorage(), draftKey.value, JSON.stringify(value) === originalDraft ? null : value)
    draftRestored.value = false
}, { flush: 'sync' })
const { folders, folderOptions, loadingFolders, folderError, loadFolders } = useInboxFolders()
const close = () => { if (!saving.value) emit('close') }
let pointerStartedOutside = false
const isOutsideDialog = (event: MouseEvent) => {
    const bounds = dialog.value?.getBoundingClientRect()
    return !!bounds && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
}
const onPointerDown = (event: PointerEvent) => {
    pointerStartedOutside = event.target === dialog.value && isOutsideDialog(event)
}
const onBackdropClick = (event: MouseEvent) => {
    const shouldClose = pointerStartedOutside && isOutsideDialog(event)
    pointerStartedOutside = false
    if (shouldClose) close()
}
watch(() => props.open, async open => {
    pointerStartedOutside = false
    draftReady = false
    if (!open) { dialog.value?.close(); return }
    title.value = props.inbox?.title ?? ''; description.value = props.inbox?.description ?? ''; folderId.value = props.inbox?.folderId ?? ''; errorMessage.value = ''
    maxSize.value = (props.inbox?.maxFileSize ?? 10485760) / 1048576; maxFiles.value = props.inbox?.maxFiles ?? 100; expiryDays.value = props.inbox ? -1 : 7
    originalDraft = JSON.stringify(draftValue())
    const draft = import.meta.client && draftKey.value ? readFormDraft<InboxDraft>(browserDraftStorage(), draftKey.value, (value): value is InboxDraft => inboxDraftSchema.safeParse(value).success) : null
    draftStored.value = draftRestored.value = !!draft
    if (draft) applyDraft(draft)
    draftReady = true
    await nextTick()
    if (!props.open || !dialog.value?.isConnected) return
    if (!dialog.value.open) dialog.value.showModal()
    titleInput.value?.focus()
    await loadFolders()
    if (folderId.value && !folders.value.some(folder => folder.id === folderId.value)) folderId.value = ''
    draftReady = props.open
}, { flush: 'post' })
const save = async () => {
    if (saving.value || loadingFolders.value || folderError.value) return
    saving.value = true; errorMessage.value = ''
    try {
        await $fetch(props.inbox ? `/api/inbox/${props.inbox.id}` : '/api/inbox', { method: props.inbox ? 'PATCH' : 'POST', body: {
            title: title.value, description: description.value, folderId: folderId.value || null,
            maxFileSize: Math.round(maxSize.value * 1024 * 1024), maxFiles: maxFiles.value,
            expiresAt: expiryDays.value === -1 ? props.inbox?.expiresAt ?? null : expiryDays.value ? new Date(Date.now() + expiryDays.value * 86400000).toISOString() : null
        } })
        draftReady = false; clearDraft(); emit('saved'); emit('close')
    } catch (error: any) { errorMessage.value = error.data?.message || 'Could not save inbox.' }
    finally { saving.value = false }
}
</script>

<style scoped>
.request-dialog { margin: auto; width: min(34rem, calc(100% - 2rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 0; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); }
.request-dialog::backdrop { background: #0009; backdrop-filter: blur(3px); }
.request-field { display: flex; flex-direction: column; gap: .5rem; font-size: .875rem; color: var(--color-label); }
</style>
