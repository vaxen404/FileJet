<script setup lang="ts">
import type { NoteHistory, NoteVersion, NoteVersionContent } from '~~/shared/types/noteVersion'
import { diffNoteLines } from '~~/shared/utils/noteDiff'
import { formatFileSize } from '~/utils/file'
const props = defineProps<{ noteId: string; revision: number; title: string; content: string; disabled?: boolean; locked?: boolean }>()
const emit = defineEmits<{ changed: []; restoring: [busy: boolean] }>()
const { confirm } = useConfirm(), { openToast } = useToast()
const history = ref<NoteHistory | null>(null), loading = ref(false), busy = ref(false), error = ref(''), shown = ref(5)
const selected = ref<NoteVersionContent | null>(null), dialog = ref<HTMLDialogElement | null>(null), mode = ref<'preview'|'compare'>('compare')
const base = computed(() => `/api/notes/${encodeURIComponent(props.noteId)}/versions`)
const diff = computed(() => diffNoteLines(selected.value?.content ?? '', props.content))
let generation = 0
const backdropPressed = ref(false)
const load = async () => {
    const current = ++generation
    loading.value = true; error.value = ''
    try { const data = await $fetch<NoteHistory>(base.value); if (current === generation) history.value = data }
    catch (err: any) { if (current === generation) error.value = err.data?.message || 'Could not load note history.' }
    finally { if (current === generation) loading.value = false }
}
const close = () => { dialog.value?.close(); selected.value = null }
const view = async (version: NoteVersion) => {
    if (busy.value || props.locked) return
    busy.value = true; error.value = ''
    try { selected.value = await $fetch<NoteVersionContent>(`${base.value}/${version.id}`); mode.value = 'compare'; await nextTick(); dialog.value?.showModal() }
    catch (err: any) { error.value = err.data?.message || 'Could not open saved version.' }
    finally { busy.value = false }
}
const restore = async (version: NoteVersion) => {
    if (busy.value || props.disabled) return
    // Close the native modal so the app's confirmation remains interactive.
    dialog.value?.close()
    if (!await confirm({ title: `Restore note version ${version.revision}?`, message: 'The saved title and content will replace the current note. Current content will be kept in version history. Shared links will show the restored note.', confirmText: 'Restore version' })) return
    if (props.disabled) return
    busy.value = true; error.value = ''; emit('restoring',true)
    try { await $fetch(`${base.value}/${version.id}/restore`,{ method: 'POST', body: { revision: props.revision } }); selected.value = null; emit('changed'); await load(); openToast('Note version restored.', 'success') }
    catch (err: any) { error.value = err.data?.message || 'Could not restore note version.' }
    finally { busy.value = false; emit('restoring',false) }
}
const remove = async (version: NoteVersion) => {
    if (busy.value || props.locked || !await confirm({ title: `Delete note version ${version.revision}?`, message: 'This saved version will be removed permanently and its storage released. The current note stays available.', confirmText: 'Delete version', variant: 'danger' })) return
    busy.value = true; error.value = ''
    try { await $fetch(`${base.value}/${version.id}`,{ method: 'DELETE' }); await load(); openToast('Saved note version deleted.', 'success') }
    catch (err: any) { error.value = err.data?.message || 'Could not delete saved version.' }
    finally { busy.value = false }
}
const download = () => {
    if (!selected.value) return
    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([selected.value.content],{ type: 'text/markdown;charset=utf-8' }))
    link.href = url; link.download = selected.value.title.replace(/[\\/:*?"<>|]/g,'_') + `-v${selected.value.revision}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
}
onMounted(load)
watch(() => props.revision, load)
onBeforeUnmount(() => { ++generation; dialog.value?.close() })
</script>
<template>
    <section class="note-version-history rounded-xl border border-divider bg-surface p-4">
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="m-0 text-sm font-semibold text-foreground">Note version history</h2><span class="text-xs text-muted">Current: v{{ revision }}</span></div>
        <p class="my-2 text-xs leading-5 text-muted">Changes save the previous title and content. Keeps the latest {{ history?.limit ?? 100 }} versions; saved versions count toward storage.</p>
        <button type="button" class="inbox-button" :disabled="busy || loading" @click="load">Refresh history</button>
        <p v-if="disabled" class="mt-2 text-xs text-muted">Save or discard unsaved changes before restoring a version.</p>
        <p v-if="error" role="alert" class="mt-3 text-sm text-danger">{{ error }}</p><p v-if="loading" role="status" class="mt-3 text-xs text-muted">Loading note history…</p><p v-else-if="!history?.versions.length" class="mt-3 text-sm text-muted">No earlier versions yet. History starts with your next saved change.</p>
        <ol v-if="history?.versions.length" class="m-0 mt-3 list-none p-0"><li v-for="version in history.versions.slice(0,shown)" :key="version.id" class="border-t border-divider py-3"><div class="flex justify-between gap-2 text-sm text-foreground"><strong>Version {{ version.revision }}</strong><span class="text-xs text-muted">{{ formatFileSize(version.size) }}</span></div><p class="mb-0 mt-1 break-all text-xs text-content">{{ version.title }}</p><p class="mb-0 mt-1 text-xs text-muted">{{ new Date(version.createdAt).toLocaleString() }}</p><div class="mt-2 flex flex-wrap gap-2"><button type="button" class="inbox-button" :disabled="busy || locked" @click="view(version)">View / compare</button><button type="button" class="inbox-button" :disabled="busy || disabled" @click="restore(version)">Restore</button><button type="button" class="inbox-button text-danger!" :disabled="busy || locked" @click="remove(version)">Delete</button></div></li></ol>
        <button v-if="history && shown < history.versions.length" type="button" class="inbox-button mt-2" @click="shown += 10">Show more versions</button>
        <Teleport to="body"><dialog ref="dialog" class="note-version-dialog" aria-labelledby="note-version-dialog-title" @cancel="selected = null" @close="selected = null" @pointerdown="backdropPressed = $event.button === 0 && $event.target === $event.currentTarget" @pointerup="backdropPressed = backdropPressed && $event.target === $event.currentTarget" @pointercancel="backdropPressed = false" @click.self="() => { if (backdropPressed) close(); backdropPressed = false }">
            <div v-if="selected" class="flex min-h-0 flex-1 flex-col gap-3 p-5 max-phone:p-3"><header class="flex items-start justify-between gap-3"><div class="min-w-0"><h2 id="note-version-dialog-title" class="m-0 text-lg font-semibold">Note version {{ selected.revision }}</h2><p class="mb-0 mt-1 break-all text-sm text-muted">{{ selected.title }} · {{ new Date(selected.createdAt).toLocaleString() }}</p></div><button type="button" class="inbox-button shrink-0" aria-label="Close note version" @click="close"><Icon name="solar:close-circle-linear" /></button></header>
                <div class="flex flex-wrap gap-2"><button type="button" class="inbox-button" :aria-pressed="mode === 'preview'" @click="mode = 'preview'">Saved version</button><button type="button" class="inbox-button" :aria-pressed="mode === 'compare'" @click="mode = 'compare'">Compare with current</button><button type="button" class="inbox-button" @click="download">Download .md</button><button type="button" class="inbox-button" :disabled="disabled || busy" @click="restore(selected)">Restore this version</button></div>
                <template v-if="mode === 'compare'"><p class="m-0 break-all text-xs text-muted">Title: {{ selected.title === title ? title : `${selected.title} → ${title}` }}</p><p class="m-0 text-xs text-muted">− Removed from saved version · + Added in current v{{ revision }}</p><p v-if="diff.truncated" class="m-0 text-xs text-danger">Comparison preview is limited for large notes. Download the saved version for the full text.</p><div class="min-h-0 flex-1 overflow-auto rounded-lg border border-divider bg-input p-2 font-mono text-xs leading-6" aria-label="Note differences"><div v-for="(line,index) in diff.lines" :key="index" class="flex min-w-0 gap-2" :class="line.kind === 'added' ? 'bg-emerald-500/10 text-emerald-500' : line.kind === 'removed' ? 'bg-danger-surface text-danger' : 'text-content'"><span class="w-3 shrink-0 select-none" aria-hidden="true">{{ line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' ' }}</span><span class="min-w-0 whitespace-pre-wrap break-all">{{ line.text || ' ' }}</span></div></div></template>
                <textarea v-else class="min-h-0 w-full flex-1 resize-none rounded-lg border border-divider bg-input p-3 font-mono text-sm leading-6 text-content" :value="selected.content" readonly aria-label="Saved note content" />
            </div>
        </dialog></Teleport>
    </section>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";
.note-version-dialog { @apply fixed inset-0 m-auto flex h-[min(90dvh,52rem)] w-[min(64rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-2xl border border-divider bg-surface p-0 text-foreground shadow-2xl; }
.note-version-dialog:not([open]) { display: none; }
.note-version-dialog::backdrop { background: rgb(0 0 0 / .7); }
</style>
