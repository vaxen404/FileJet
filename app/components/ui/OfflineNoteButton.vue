<script setup lang="ts">
import type { OfflineNote } from '~/utils/offlineNotes'
import { loadOfflineStore } from '~/utils/offlineNotes'
const props = defineProps<{ note: OfflineNote; disabled?: boolean }>()
const owner = useAuthUser(), working = ref(false)
const { openToast } = useToast()
const open = async () => {
    if (!owner.value || working.value || props.disabled) return
    working.value = true
    try {
        const store = await loadOfflineStore()
        await store.setOwner(owner.value.id)
        await store.cacheNote(owner.value.id, props.note)
        await store.registerOffline()
        location.assign(`/offline-notes.html?note=${encodeURIComponent(props.note.id)}`)
    } catch (error: any) { openToast(error.message || 'Could not prepare offline notes.', 'error'); working.value = false }
}
</script>
<template><div class="rounded-xl border border-divider bg-surface p-4"><h2 class="m-0 text-sm font-semibold text-foreground">Offline notes</h2><p class="my-2 text-xs leading-5 text-muted">Edit in the offline editor, then sync when connected. Device copies are removed when you log out.</p><button type="button" class="inbox-button" :disabled="disabled || working" @click="open"><Icon name="solar:cloud-download-linear" />{{ working ? 'Preparing…' : 'Edit offline' }}</button><p v-if="disabled" class="mb-0 mt-2 text-xs text-muted">Save current changes before opening the offline editor.</p></div></template>
