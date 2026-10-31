<template>
    <main :style="inboxAccent" class="flex min-h-dvh items-center justify-center bg-canvas p-4 text-foreground">
        <section class="w-full max-w-xl rounded-2xl border border-divider bg-surface p-6 sm:p-8">
            <div class="mb-7 flex items-center gap-2"><BrandMark accent-color="indigo" class="size-9" /><span class="text-lg font-bold">FileJet</span><span class="ml-auto rounded-md bg-accent/10 px-2 py-1 text-xs text-accent">File request</span></div>
            <p v-if="pending" role="status" class="py-10 text-center text-sm text-muted">Loading file request…</p>
            <div v-else-if="error || !request" class="py-8 text-center"><Icon name="solar:link-broken-linear" size="40" class="text-muted" /><h1 class="mt-4 text-xl font-semibold">File request unavailable</h1><p class="mt-3 text-sm leading-6 text-muted">{{ requestErrorMessage }}</p><button v-if="!error?.statusCode || error.statusCode >= 500" class="inbox-button mt-5" @click="refresh()">Try again</button></div>
            <template v-else>
                <span class="mb-4 grid size-12 place-items-center rounded-xl bg-accent/10 text-accent"><Icon name="solar:inbox-in-linear" size="27" /></span>
                <h1 class="break-words text-2xl font-semibold">{{ request.title }}</h1>
                <p v-if="request.description" class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-label">{{ request.description }}</p>
                <p class="mt-3 text-sm leading-6 text-muted">Send files for the recipient to review. No account needed. Your uploads are visible only to the recipient.</p>
                <div v-if="uploadedCount" role="status" class="mt-6 rounded-xl border border-accent/30 bg-accent/10 p-5 text-center"><Icon name="solar:check-circle-linear" size="34" class="text-accent" /><h2 class="mt-2 font-semibold">Files sent successfully</h2><p class="mt-2 text-sm text-label">{{ uploadedCount }} {{ uploadedCount === 1 ? 'file has' : 'files have' }} been delivered.</p><button type="button" class="inbox-button mt-4" @click="sendMore">Send more files</button></div>
                <form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="upload">
                    <label class="flex flex-col gap-2 text-sm text-label">Your name <span class="text-xs text-muted">Optional · shown to the recipient</span><input v-model="senderName" maxlength="100" autocomplete="name" class="inbox-input" :disabled="sending"></label>
                    <label class="flex flex-col gap-2 text-sm text-label">Note to the recipient <span class="text-xs text-muted">Optional · up to 1000 characters</span><textarea v-model="senderNote" maxlength="1000" rows="3" class="inbox-input resize-y" :disabled="sending" placeholder="Tell the recipient about these files…" /></label>
                    <p v-if="senderDraftSaved" class="text-xs text-muted">Your name and note are saved on this browser until you send the files. <button type="button" class="underline" :disabled="sending" @click="clearSenderDraft">Discard draft</button></p>
                    <div class="rounded-xl border border-dashed p-6 text-center" :class="dragging ? 'border-accent bg-accent/10' : 'border-control-border bg-canvas'" @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="drop">
                        <Icon name="solar:cloud-upload-linear" size="36" class="text-accent" />
                        <p class="mt-3 text-sm font-medium">Add files or drop them here</p>
                        <p class="mt-2 text-xs leading-5 text-muted">Up to {{ request.maxFilesPerUpload }} files · {{ formatFileSize(request.maxFileSize) }} each · 50 MB per upload</p>
                        <input :id="inputId" ref="fileInput" type="file" multiple class="sr-only" :disabled="sending" @change="choose">
                        <button type="button" class="inbox-button mt-4" :disabled="sending" @click="fileInput?.click()">Add files</button>
                    </div>
                    <div v-if="files.length" class="flex flex-col gap-2">
                        <div class="flex items-center justify-between gap-3"><p class="text-xs text-muted">{{ files.length }} {{ files.length === 1 ? 'file selected' : 'files selected' }}</p><button type="button" class="inbox-button text-danger!" :disabled="sending" aria-label="Remove all files" @click="removeAllFiles"><Icon name="solar:trash-bin-trash-linear" />Remove all</button></div>
                        <ul aria-label="Selected files" class="flex flex-col gap-2"><li v-for="(file, index) in files" :key="index" class="flex min-w-0 items-center gap-3 rounded-lg border border-divider px-3 py-2"><Icon name="solar:document-linear" class="shrink-0 text-accent" /><div class="min-w-0 flex-1"><p class="truncate text-sm">{{ file.name }}</p><p class="mt-1 text-xs text-muted">{{ formatFileSize(file.size) }}</p></div><button type="button" :aria-label="`Remove ${file.name}`" :disabled="sending" class="inbox-icon" @click="removeFile(index)"><Icon name="solar:close-circle-linear" size="20" /></button></li></ul>
                    </div>
                    <p v-if="uploadError" role="alert" class="text-sm leading-6 text-danger">{{ uploadError }}</p>
                    <div v-if="sending" role="status"><progress :value="progress" max="100" class="h-2 w-full accent-accent" /><p class="mt-2 text-center text-xs text-muted">{{ progress === 100 ? 'Finishing upload…' : `Uploading… ${progress}%` }}</p></div>
                    <button type="submit" class="inbox-button inbox-primary w-full" :disabled="sending || !files.length"><Icon name="solar:upload-linear" size="19" />{{ sending ? 'Sending files…' : 'Send files' }}</button>
                    <p class="text-center text-xs leading-5 text-muted">You can upload files here. Other files in the recipient’s account remain private.</p>
                </form>
            </template>
        </section>
    </main>
</template>

<script setup lang="ts">
import type { PublicFileRequest } from '~~/shared/types/inbox'
import { formatFileSize } from '~/utils/file'
import { getAccentColor } from '~/utils/appearance'
import { browserDraftStorage, readFormDraft, writeFormDraft } from '~/utils/formDraft'
import { parseSender } from '~~/shared/utils/sender'
definePageMeta({ layout: false })
useHead({ title: 'Send files · FileJet', meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] })
const { resolvedTheme } = useTheme()
const inboxAccent = computed(() => {
    const indigo = getAccentColor('indigo')
    return {
        '--color-primary': indigo.primary,
        '--color-accent': resolvedTheme.value === 'light' ? indigo.primary : indigo.accent,
        '--color-highlight': indigo.highlight
    }
})
const route = useRoute(), inputId = useId()
const token = computed(() => String(route.params.token))
const { data: request, pending, error, refresh } = await useFetch<PublicFileRequest>(() => `/api/requests/${encodeURIComponent(token.value)}`)
const requestErrorMessage = computed(() => (error.value?.data as { message?: string } | undefined)?.message || 'This request may be closed, expired, or removed. Ask the sender for a new link.')
const files = ref<File[]>([]), senderName = ref(''), senderNote = ref(''), uploadError = ref('')
const senderDraftSaved = ref(false)
const senderDraftKey = computed(() => `filejet:sender-draft:${token.value}`)
let senderDraftReady = false
const clearSenderDraft = () => { senderName.value = ''; senderNote.value = ''; writeFormDraft(browserDraftStorage(), senderDraftKey.value, null); senderDraftSaved.value = false }
onMounted(() => {
    const saved = readFormDraft<{ senderName: string; senderNote: string }>(browserDraftStorage(), senderDraftKey.value, (value): value is { senderName: string; senderNote: string } => {
        try { if (!value || typeof value !== 'object') return false; parseSender(value); return true } catch { return false }
    })
    if (saved) { senderName.value = saved.senderName ?? ''; senderNote.value = saved.senderNote ?? ''; senderDraftSaved.value = true }
    senderDraftReady = true
})
watch([senderName, senderNote], () => {
    if (!senderDraftReady) return
    senderDraftSaved.value = writeFormDraft(browserDraftStorage(), senderDraftKey.value, senderName.value || senderNote.value ? { senderName: senderName.value, senderNote: senderNote.value } : null)
}, { flush: 'sync' })
const sending = ref(false), dragging = ref(false), progress = ref(0), uploadedCount = ref(0), fileInput = ref<HTMLInputElement | null>(null)
let activeUpload: XMLHttpRequest | null = null
const addFiles = (selected: File[]) => {
    if (sending.value || !request.value) return
    uploadError.value = ''
    if (!selected.length) return
    const nextFiles = [...files.value, ...selected]
    if (nextFiles.length > request.value.maxFilesPerUpload) { uploadError.value = `Add up to ${request.value.maxFilesPerUpload} files in total.`; return }
    if (selected.some(file => file.size > request.value!.maxFileSize)) { uploadError.value = `Each file must be ${formatFileSize(request.value.maxFileSize)} or smaller.`; return }
    if (nextFiles.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) { uploadError.value = 'Upload up to 50 MB at a time.'; return }
    files.value = nextFiles
}
const choose = (event: Event) => { const input = event.target as HTMLInputElement; addFiles(Array.from(input.files ?? [])); input.value = '' }
const drop = (event: DragEvent) => { dragging.value = false; addFiles(Array.from(event.dataTransfer?.files ?? [])) }
const removeFile = (index: number) => { if (!sending.value) { files.value.splice(index, 1); uploadError.value = '' } }
const removeAllFiles = () => { if (!sending.value) { files.value = []; uploadError.value = ''; if (fileInput.value) fileInput.value.value = '' } }
const sendMore = async () => { await refresh(); uploadedCount.value = 0 }
const upload = async () => {
    if (sending.value || !files.value.length) return
    const body = new FormData()
    body.append('senderName', senderName.value)
    body.append('senderNote', senderNote.value)
    for (const file of files.value) body.append('files', file)
    sending.value = true; uploadError.value = ''; progress.value = 0
    try {
        const result = await new Promise<{ uploadedCount: number }>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            activeUpload = xhr
            xhr.open('POST', `/api/requests/${encodeURIComponent(token.value)}/upload`)
            xhr.timeout = 180000
            xhr.upload.onprogress = event => { if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100) }
            xhr.onload = () => {
                let response: any
                try { response = JSON.parse(xhr.responseText) } catch { reject(new Error('Could not send files. Please try again.')); return }
                if (xhr.status >= 200 && xhr.status < 300) resolve(response)
                else reject(new Error(response.message || 'Could not send files. Please try again.'))
            }
            xhr.onerror = () => reject(new Error('Connection lost. Please try again.'))
            xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'))
            xhr.onabort = () => reject(new Error('Upload cancelled.'))
            xhr.send(body)
        })
        uploadedCount.value = result.uploadedCount; files.value = []; clearSenderDraft()
    } catch (error: any) { uploadError.value = error.message || 'Could not send files.' }
    finally { sending.value = false; activeUpload = null }
}
onBeforeUnmount(() => activeUpload?.abort())
onBeforeRouteLeave(() => !sending.value || window.confirm('Your upload is still in progress. Leave this page?'))
</script>
