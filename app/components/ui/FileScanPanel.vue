<script setup lang="ts">
import type { FileScanState } from '~~/shared/types/fileScan'

const props = defineProps<{ fileId: string; revision: number }>()
const emit = defineEmits<{ changed: []; status: [state: FileScanState] }>()
const state = ref<FileScanState | null>(null), busy = ref(false), errorMessage = ref('')
let timer: ReturnType<typeof setTimeout> | null = null, disposed = false
let initialPolls = 5
const label = computed(() => ({ unscanned: 'Not scanned yet', scanning: 'Scanning…', clean: 'No threat found', infected: 'Threat detected — quarantined', error: 'Could not scan — access blocked' })[state.value?.status ?? 'unscanned'])
watch(state, value => { if (value) emit('status', value) }, { flush: 'sync' })
const load = async () => {
    if (disposed) return
    try {
        state.value = await $fetch<FileScanState>(`/api/files/${encodeURIComponent(props.fileId)}/scan`)
        if (!disposed && (state.value.status === 'scanning' || (state.value.status === 'unscanned' && initialPolls-- > 0))) timer = setTimeout(load, 2500)
    } catch { errorMessage.value = 'Could not load scan status.' }
}
const scan = async () => {
    if (busy.value) return
    busy.value = true; errorMessage.value = ''
    if (timer) clearTimeout(timer)
    state.value = { status: 'scanning', threat: null, message: null, checkedAt: null }
    try {
        state.value = await $fetch<FileScanState>(`/api/files/${encodeURIComponent(props.fileId)}/scan`, { method: 'POST', timeout: 330000 })
        if (state.value.status === 'scanning') timer = setTimeout(load, 2500)
        emit('changed')
    } catch (error: any) { errorMessage.value = error.data?.message || 'The antivirus service is unavailable. Access remains blocked.'; await load() }
    finally { busy.value = false }
}
defineExpose({ scan })
onMounted(load)
watch(() => props.revision, () => { initialPolls = 5; if (timer) clearTimeout(timer); void load() })
onBeforeUnmount(() => { disposed = true; if (timer) clearTimeout(timer) })
</script>
<template>
    <section class="file-scan-panel rounded-xl border border-divider bg-surface p-4" :class="{ 'border-danger!': state?.status === 'infected' }">
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-semibold text-foreground">Virus protection</h2><button type="button" class="inbox-button" :disabled="busy || state?.status === 'scanning'" @click="scan"><Icon name="solar:shield-check-linear" />{{ busy ? 'Scanning…' : 'Scan file' }}</button></div>
        <p class="mt-3 text-sm" :class="state?.status === 'infected' || state?.status === 'error' ? 'text-danger' : 'text-content'" role="status" aria-live="polite">{{ label }}</p>
        <p v-if="state?.threat" class="mt-2 break-all text-xs text-danger">{{ state.threat }}</p>
        <p v-if="state?.message" class="mt-2 text-xs leading-5 text-muted">{{ state.message }}</p>
        <p v-if="state?.checkedAt" class="mt-2 text-xs text-muted">Last scan: {{ new Date(state.checkedAt).toLocaleString() }}</p>
        <p v-if="errorMessage" class="mt-2 text-xs text-danger" role="alert">{{ errorMessage }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">Files stay blocked until a scan succeeds. No antivirus can guarantee a file is completely safe.</p>
    </section>
</template>
