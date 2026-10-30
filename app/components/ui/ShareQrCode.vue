<template>
    <figure class="m-0 flex min-w-0 flex-col items-center gap-3 rounded-xl border border-divider bg-raised p-4">
        <figcaption class="text-center text-sm font-medium text-foreground">
            Scan to open this {{ itemType }}
        </figcaption>
        <p v-if="loading" role="status" class="m-0 text-xs text-muted">Generating QR code...</p>
        <template v-else-if="imageUrl">
            <img
                :src="imageUrl"
                :alt="`QR code for the shared ${itemType}`"
                width="240"
                height="240"
                class="block size-60 max-w-full h-auto rounded-lg bg-white"
            />
            <a
                :href="imageUrl"
                :download="`filejet-${itemType}-qr.png`"
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-control-border
                    bg-surface px-3 text-sm font-medium text-content no-underline hover:text-foreground
                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
                <Icon name="solar:download-minimalistic-linear" /> Download QR code
            </a>
        </template>
        <div v-else-if="errorMessage" class="text-center">
            <p role="alert" class="m-0 text-xs text-danger">{{ errorMessage }}</p>
            <button type="button" class="mt-2 min-h-10 cursor-pointer rounded-md px-3 text-sm text-accent
                focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" @click="generate">
                Try again
            </button>
        </div>
        <p class="m-0 text-center text-xs leading-normal text-muted">
            Open your phone's camera and scan the code.
            {{ hasPassword ? 'The link password is required to access this item.' : 'Anyone with this code can access this item.' }}
        </p>
    </figure>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import type { SharedItemType } from '~~/shared/types/share'

const props = defineProps<{ url: string; itemType: SharedItemType; hasPassword: boolean }>()
const imageUrl = ref('')
const loading = ref(false)
const errorMessage = ref('')
let requestId = 0

const generate = async () => {
    const id = ++requestId
    const url = props.url
    imageUrl.value = ''
    errorMessage.value = ''
    loading.value = true

    try {
        const image = await QRCode.toDataURL(url, {
            type: 'image/png',
            width: 480,
            margin: 4,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000ff', light: '#ffffffff' }
        })

        if (id === requestId && url === props.url) imageUrl.value = image
    } catch {
        if (id === requestId) errorMessage.value = 'Could not generate the QR code.'
    } finally {
        if (id === requestId) loading.value = false
    }
}

onMounted(() => {
    watch(() => props.url, generate, { immediate: true })
})

onBeforeUnmount(() => { requestId++ })
</script>
