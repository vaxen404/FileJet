<template>
    <Teleport to="body">
        <dialog ref="dialog" aria-labelledby="request-qr-title" class="request-qr-dialog" @close="emit('close')" @click.self="emit('close')">
            <div class="flex flex-col items-center gap-4 p-6 text-center">
                <div class="flex w-full items-center justify-between gap-3"><h2 id="request-qr-title" class="text-base font-semibold">Scan to send files</h2><button class="inbox-icon" type="button" aria-label="Close QR code" @click="emit('close')"><Icon name="solar:close-circle-linear" size="23" /></button></div>
                <p class="max-w-full truncate text-sm text-muted">{{ item?.title }}</p>
                <img v-if="image" :src="image" alt="QR code to upload files to this request" width="240" height="240" class="size-60 max-w-full rounded-lg bg-white">
                <p v-else role="status" class="text-sm text-muted">{{ errorMessage || 'Generating QR code…' }}</p>
                <a v-if="image" :href="image" download="filejet-request-qr.png" class="inbox-button">Download QR code</a>
                <p class="text-xs leading-5 text-muted">Anyone with this code can send files while the request is open.</p>
            </div>
        </dialog>
    </Teleport>
</template>
<script setup lang="ts">
import QRCode from 'qrcode'
import type { FileRequestItem } from '~~/shared/types/inbox'
const props = defineProps<{ item: FileRequestItem | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null), image = ref(''), errorMessage = ref('')
watch(() => props.item, async item => {
    image.value = ''; errorMessage.value = ''
    if (!item) { dialog.value?.close(); return }
    await nextTick()
    if (props.item !== item || !dialog.value?.isConnected) return
    if (!dialog.value.open) dialog.value.showModal()
    try {
        const result = await QRCode.toDataURL(item.url, { width: 480, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } })
        if (props.item === item) image.value = result
    } catch { errorMessage.value = 'Could not generate QR code. Copy the request link instead.' }
}, { flush: 'post' })
</script>
<style scoped>
.request-qr-dialog { margin: auto; width: min(25rem, calc(100% - 2rem)); max-height: calc(100dvh - 2rem); overflow: auto; border: 1px solid var(--color-divider); border-radius: 1rem; background: var(--color-surface); color: var(--color-foreground); }
.request-qr-dialog::backdrop { background: #0009; backdrop-filter: blur(3px); }
</style>
