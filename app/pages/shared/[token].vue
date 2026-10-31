<template>
    <div class="shared-page public-share-page w-full h-dvh min-h-0 p-3 flex flex-col bg-canvas text-foreground
        overflow-hidden max-mobile:p-[0.6rem]">
        <div
            v-if="passwordRequired"
            class="shared-error flex-1 basis-0 min-w-0 min-h-0 flex items-center justify-center p-4 short-screen:p-0
                has-unlock:overflow-y-auto"
        >
            <form
                class="shared-error-card share-unlock w-full max-w-108 flex flex-col items-center gap-4
                    p-[clamp(1.25rem,_4vw,_2.5rem)] bg-surface border border-divider rounded-3xl text-center text-accent
                    my-auto shrink-0 short-screen:gap-[0.6rem] short-screen:p-4"
                @submit.prevent="unlockShare"
            >
                <Icon class=""
                    name="solar:lock-keyhole-linear"
                    size="2.75rem"
                />
                <h1 class="m-0 text-foreground text-[clamp(1.2rem,_3vw,_1.5rem)] font-semibold leading-[1.35] wrap-anywhere">Password Protected</h1>
                <p
                    v-if="lockedFileName"
                    class="locked-filename max-w-84 m-0 text-content text-[0.85rem] leading-[1.7] w-full wrap-anywhere
                        font-medium"
                    :title="lockedFileName"
                >
                    {{ lockedFileName }}
                </p>
                <p class="max-w-84 m-0 text-muted text-[0.85rem] leading-[1.7]">
                    {{
                        passwordChallenge.itemType === 'folder'
                            ? 'This folder is protected by a password.'
                            : passwordChallenge.itemType === 'note'
                              ? 'This note is protected by a password.'
                              : 'This file is protected by a password.'
                    }}
                </p>
                <label class="w-full text-left text-content text-sm leading-[inherit]" for="public-share-password">Password</label>
                <div class="unlock-password-field relative w-full">
                    <input class="w-full h-11 py-0 px-3 text-foreground bg-input border border-control-border rounded-md text-sm
                        outline-none pr-11 focus:border-accent leading-[inherit]"
                        id="public-share-password"
                        v-model="sharePassword"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Enter password"
                        autocomplete="current-password"
                        required
                        maxlength="128"
                        :disabled="unlocking"
                        @input="unlockError = ''"
                    />
                    <button
                        type="button"
                        class="password-visibility absolute top-0 right-0 flex items-center justify-center p-0 border-0 rounded-md
                            text-muted bg-transparent cursor-pointer hover:text-foreground focus-visible:outline-2
                            focus-visible:outline-accent focus-visible:-outline-offset-2 disabled:opacity-65
                            disabled:cursor-wait size-11"
                        :title="showPassword ? 'Hide password' : 'Show password'"
                        :disabled="unlocking"
                        @click="showPassword = !showPassword"
                    >
                        <Icon class=""
                            :name="showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'"
                            size="1.2rem"
                        />
                    </button>
                </div>
                <p
                    v-if="unlockError"
                    id="unlock-error"
                    class="unlock-error max-w-84 m-0 text-danger text-[0.85rem] leading-[1.7]"
                >
                    {{ unlockError }}
                </p>
                <button
                    type="submit"
                    class="download-btn mt-1"
                    :disabled="unlocking || !sharePassword"
                >
                    {{
                        unlocking
                            ? 'Unlocking...'
                            : passwordChallenge.itemType === 'folder'
                              ? 'Unlock Folder'
                              : passwordChallenge.itemType === 'note'
                                ? 'Unlock Note'
                                : 'Unlock File'
                    }}
                </button>
            </form>
        </div>
        <div
            v-else-if="error"
            class="shared-error flex-1 basis-0 min-w-0 min-h-0 flex items-center justify-center p-4 short-screen:p-0
                has-unlock:overflow-y-auto"
        >
            <div class="shared-error-card w-full max-w-108 flex flex-col items-center gap-4 p-[clamp(1.25rem,_4vw,_2.5rem)]
                bg-surface border border-divider rounded-3xl text-center short-screen:gap-[0.6rem] short-screen:p-4">
                <div class="shared-error-icon flex items-center justify-center bg-accent/12 border border-accent/25 rounded-md
                    text-accent short-screen:w-16 short-screen:h-16 size-22">
                    <Icon class=""
                        :name="
                            error.statusCode === 404
                                ? 'solar:link-broken-linear'
                                : 'solar:danger-circle-linear'
                        "
                        size="2.75rem"
                    />
                </div>

                <span class="shared-error-code py-[0.35rem] px-3 text-accent bg-accent/12 border border-accent/25 rounded-md
                    text-xs leading-[inherit] font-semibold tracking-[0.08em]">{{ error.statusCode || 'Error' }}</span>

                <h1 class="m-0 text-foreground text-[clamp(1.2rem,_3vw,_1.5rem)] font-semibold leading-[1.35] wrap-anywhere">
                    {{
                        error.statusCode === 410
                            ? 'Link Expired'
                            : error.statusCode === 403 || error.statusCode === 401
                              ? 'Access Denied'
                              : error.statusCode === 404
                                ? 'Shared item not found'
                                : 'Unable to load shared item'
                    }}
                </h1>

                <p class="max-w-84 m-0 text-muted text-[0.85rem] leading-[1.7]">
                    {{
                        error.statusCode === 404 || error.statusCode === 410
                            ? 'This link may be invalid or no longer available. Ask the sender for a new link.'
                            : 'Something went wrong while opening this link. Please try again in a moment.'
                    }}
                </p>
            </div>
        </div>

        <template v-else-if="sharedItem">
            <div
                v-if="sharedItem.type === 'file'"
                class="shared-content basis-0 flex-1 min-w-0 min-h-0 flex bg-surface border border-divider rounded-3xl
                    overflow-hidden media-content:items-center media-content:justify-center media-content:bg-[#0d0d10]
                    image-content:bg-transparent image-content:border-0 text-content:block text-content:py-4
                    text-content:px-[1.2rem] text-content:overflow-auto text-content:overscroll-contain
                    text-content:wrap-anywhere"
                :class="{
                    'media-content': isImage || isPdf || isVideo,
                    'image-content': isImage,
                    'text-content': isText
                }"
            >
                <div
                    v-if="isImage"
                    ref="imageStage"
                    class="image-stage relative flex items-center justify-center min-w-0 min-h-0 fullscreen:w-full
                        fullscreen:h-dvh fullscreen:p-[clamp(0.5rem,_1.5vmin,_1rem)] fullscreen:bg-canvas
                        fullscreen:overflow-hidden expanded:w-full expanded:h-dvh expanded:p-[clamp(0.5rem,_1.5vmin,_1rem)]
                        expanded:bg-canvas expanded:overflow-hidden expanded:fixed expanded:inset-0 expanded:z-2000
                        size-full"
                    :class="{ 'is-expanded': isImageExpanded }"
                >
                    <img
                        class="image-preview block min-w-0 min-h-0 object-contain object-center rounded-3xl size-full"
                        :src="`/api/shared/${token}/preview`"
                        :alt="sharedItem.item.name"
                    />

                    <button
                        type="button"
                        class="image-fullscreen-btn absolute right-4 bottom-4 flex items-center justify-center p-0 text-content
                            bg-control border border-control-border rounded-md cursor-pointer transition-colors duration-200
                            hover:text-foreground hover:bg-divider focus-visible:outline-2 focus-visible:outline-accent
                            focus-visible:outline-offset-2 size-[2.6rem]"
                        :title="isImageFullscreen ? 'Exit fullscreen' : 'View fullscreen'"
                        @click="toggleImageFullscreen"
                    >
                        <Icon class=""
                            :name="
                                isImageFullscreen
                                    ? 'solar:quit-full-screen-linear'
                                    : 'solar:full-screen-linear'
                            "
                            size="1.2rem"
                        />
                    </button>
                </div>

                <template v-else-if="isText">
                    <div
                        v-if="textPreviewError"
                        class="error-message p-4 text-danger text-[0.9rem] min-h-0 overflow-auto wrap-anywhere"
                    >
                        Text preview could not be loaded.
                    </div>

                    <pre
                        v-else
                        class="text-preview m-0 whitespace-pre-wrap break-words font-mono text-[0.9rem] leading-[1.7]"
                        >{{ textContent }}</pre>
                </template>

                <iframe
                    v-else-if="isPdf"
                    class="pdf-preview block min-w-0 min-h-0 border-0 size-full"
                    :src="`/api/shared/${token}/preview`"
                    :title="itemName"
                />

                <video
                    v-else-if="isVideo"
                    class="video-preview block min-w-0 min-h-0 object-contain object-center bg-black size-full"
                    :src="`/api/shared/${token}/preview`"
                    controls
                    autoplay
                    muted
                    playsinline
                    preload="auto"
                />

                <div
                    v-else
                    class="download-message w-full min-w-0 min-h-0 flex flex-col items-center justify-center gap-4 p-6
                        text-center max-mobile:py-5 max-mobile:px-4 max-mobile:gap-[0.85rem] short-screen:grid
                        short-screen:grid-cols-[3.5rem_minmax(0,_28rem)] short-screen:content-center
                        short-screen:justify-items-start short-screen:gap-[0.4rem_1rem] short-screen:p-3
                        short-screen:text-left"
                >
                    <div class="download-icon flex-none flex items-center justify-center bg-accent/12 border border-accent/25
                        text-accent rounded-md max-mobile:w-22 max-mobile:h-22 short-screen:col-start-1
                        short-screen:row-start-1 short-screen:row-span-4 short-screen:self-center short-screen:w-14
                        short-screen:h-14 size-26">
                        <Icon class="short-screen:text-3xl! short-screen:leading-[inherit]!"
                            name="solar:file-bold"
                            size="3rem"
                        />
                    </div>

                    <h2 class="shrink-0 line-clamp-2 w-full max-w-136 mt-1 mr-0 mb-0 ml-0 text-foreground
                        text-[clamp(1.1rem,_2.5vw,_1.5rem)] font-semibold leading-[1.4] wrap-anywhere overflow-hidden
                        short-screen:col-start-2 short-screen:m-0 short-screen:text-[1.1rem]" :title="itemName">{{ itemName }}</h2>

                    <div class="download-status flex-none inline-flex items-center gap-2 py-[0.45rem] px-3 text-accent bg-accent/12
                        border border-accent/25 rounded-md text-xs font-medium leading-[1.4] short-screen:col-start-2">
                        <span class="status-dot flex-none bg-accent rounded-full shadow-[0_0_0_3px_#8b7cff1a] size-[0.4rem]" />
                        {{
                            downloadedToken === token ? 'Download started' : 'Starting download...'
                        }}
                    </div>

                    <p class="shrink-0 max-w-112 m-0 text-muted text-[0.85rem] leading-[1.6] short-screen:col-start-2
                        short-screen:text-[0.8rem] short-screen:leading-normal">
                        Your file will download automatically.<br class="" />
                        If it hasn't started, use the button below.
                    </p>

                    <button
                        type="button"
                        class="download-btn mt-1"
                        :disabled="isDownloading"
                        @click="manualDownload"
                    >
                        <Icon class=""
                            name="solar:download-linear"
                            size="1.2rem"
                        />

                        Download File
                    </button>
                </div>
            </div>

            <div
                v-else-if="sharedItem.type === 'note'"
                class="shared-content basis-0 text-content flex-1 min-w-0 min-h-0 block bg-surface border border-divider
                    rounded-3xl overflow-auto py-4 px-[1.2rem] overscroll-contain wrap-anywhere"
            >
                <div class="shared-note-heading flex items-center justify-between flex-wrap gap-3 mb-4">
                    <h1 class="m-0 text-[1.1rem] wrap-anywhere">{{ sharedItem.item.title }}</h1>
                    <a
                        class="download-btn m-0 no-underline"
                        :href="downloadUrl"
                        >Download Note</a
                    >
                </div>
                <pre class="text-preview m-0 whitespace-pre-wrap break-words font-mono text-[0.9rem] leading-[1.7]">{{ sharedItem.item.content }}</pre>
            </div>

            <div
                v-else-if="sharedItem.type === 'folder'"
                class="shared-content basis-0 shared-folder-content flex-1 min-w-0 min-h-0 flex bg-surface border
                    border-divider rounded-3xl overflow-hidden"
            >
                <SharedFolderContents class=""
                    :key="token"
                    :token="token"
                    :root-id="sharedItem.item.id"
                    :root-name="sharedItem.item.name"
                    @access-error="refresh()"
                />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useEventListener, useFullscreen } from '@vueuse/core'
import { createShareMetadata } from '~/utils/shareMetadata'

const route = useRoute()

const token = computed(() => route.params.token as string)

interface SharedResponse {
    type: 'file' | 'folder' | 'note'
    isPasswordProtected: boolean
    sharedBy: string
    item: any
}

const sharedUrl = computed(() => {
    return `/api/shared/${token.value}`
})

const { data: sharedItem, error, refresh } = await useFetch<SharedResponse>(sharedUrl)

interface PasswordChallenge {
    passwordRequired?: boolean
    fileName?: string | null
    itemName?: string | null
    itemType?: 'file' | 'folder' | 'note'
}

const passwordChallenge = computed<PasswordChallenge>(
    () => (error.value?.data as { data?: PasswordChallenge } | undefined)?.data ?? {}
)

const passwordRequired = computed(
    () => error.value?.statusCode === 401 && passwordChallenge.value.passwordRequired === true
)

const lockedFileName = computed(() =>
    passwordRequired.value ? passwordChallenge.value.itemName || passwordChallenge.value.fileName || '' : ''
)

const requestOrigin = useRequestURL().origin
const socialMetadata = computed(() => createShareMetadata({
    origin: requestOrigin,
    token: token.value,
    share: sharedItem.value,
    passwordRequired: passwordRequired.value,
    protectedName: lockedFileName.value,
    protectedType: passwordChallenge.value.itemType,
    unavailable: Boolean(error.value && !passwordRequired.value)
}))

useSeoMeta({
    title: () => socialMetadata.value.title,
    description: () => socialMetadata.value.description,
    ogTitle: () => socialMetadata.value.title,
    ogDescription: () => socialMetadata.value.description,
    ogSiteName: 'FileJet',
    ogType: 'website',
    ogUrl: () => socialMetadata.value.url,
    ogImage: () => socialMetadata.value.image,
    ogImageType: () => socialMetadata.value.imageType,
    ogImageAlt: () => socialMetadata.value.imageAlt,
    twitterCard: () => socialMetadata.value.card,
    twitterTitle: () => socialMetadata.value.title,
    twitterDescription: () => socialMetadata.value.description,
    twitterImage: () => socialMetadata.value.image,
    twitterImageAlt: () => socialMetadata.value.imageAlt,
    robots: 'noindex, nofollow, noarchive',
    themeColor: '#8b7cff'
})
useHead(() => ({ link: [{ rel: 'canonical', href: socialMetadata.value.url }] }))
if (import.meta.server) useResponseHeader('Cache-Control').value = 'private, no-store'

const sharePassword = ref('')
const showPassword = ref(false)
const unlocking = ref(false)
const unlockError = ref('')

const unlockShare = async () => {
    if (unlocking.value || !sharePassword.value) return

    unlocking.value = true
    unlockError.value = ''

    try {
        await $fetch(`/api/shared/${encodeURIComponent(token.value)}/unlock`, {
            method: 'POST',
            body: { password: sharePassword.value }
        })
        sharePassword.value = ''
        showPassword.value = false
        await refresh()

        if (error.value?.statusCode === 401)
            unlockError.value = 'Access could not be verified. Please try again.'
    } catch (err: any) {
        const status = err?.statusCode || err?.status || err?.response?.status
        unlockError.value =
            status === 401
                ? 'Incorrect password. Please try again.'
                : status === 429
                  ? 'Too many attempts. Please try again later.'
                  : err?.data?.message || 'Unable to unlock this file. Please try again.'

        if (status === 410 || status === 404 || status === 409) await refresh()
    } finally {
        unlocking.value = false
    }
}

watch(token, () => {
    sharePassword.value = ''
    showPassword.value = false
    unlockError.value = ''
})

const isImage = computed(() => {
    return (
        sharedItem.value?.type === 'file' && sharedItem.value.item.mime_type?.startsWith('image/')
    )
})

const imageStage = ref<HTMLElement | null>(null)
const isImageExpanded = ref(false)

const {
    isSupported: supportsFullscreen,
    isFullscreen,
    toggle: toggleFullscreen
} = useFullscreen(imageStage, { autoExit: true })

const isImageFullscreen = computed(() => isFullscreen.value || isImageExpanded.value)

const toggleImageFullscreen = async () => {
    if (isImageExpanded.value) {
        isImageExpanded.value = false

        return
    }

    if (!supportsFullscreen.value) {
        isImageExpanded.value = true

        return
    }

    try {
        await toggleFullscreen()
    } catch {
        if (!isFullscreen.value) {
            isImageExpanded.value = true
        }
    }
}

useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        isImageExpanded.value = false
    }
})

const isText = computed(() => {
    return sharedItem.value?.type === 'file' && sharedItem.value.item.mime_type?.startsWith('text/')
})

const isPdf = computed(() => {
    return (
        sharedItem.value?.type === 'file' && sharedItem.value.item.mime_type === 'application/pdf'
    )
})

const isVideo = computed(() => {
    return (
        sharedItem.value?.type === 'file' && sharedItem.value.item.mime_type?.startsWith('video/')
    )
})

const itemName = computed(() => {
    if (!sharedItem.value) return ''

    if (sharedItem.value.type === 'note') {
        return sharedItem.value.item.title
    }

    return sharedItem.value.item.original_name || sharedItem.value.item.name
})

const isDownloadOnly = computed(() => {
    return (
        sharedItem.value?.type === 'file' &&
        !isImage.value &&
        !isText.value &&
        !isPdf.value &&
        !isVideo.value
    )
})

const downloadUrl = computed(() => {
    return `/api/shared/${token.value}/download`
})

const isDownloading = ref(false)
const downloadError = ref(false)
const downloadedToken = ref<string | null>(null)

const autoDownload = () => {
    if (!import.meta.client) return

    if (!isDownloadOnly.value) return

    if (isDownloading.value) return

    if (downloadedToken.value === token.value) return

    isDownloading.value = true
    downloadError.value = false
    downloadedToken.value = token.value

    const link = document.createElement('a')

    link.href = downloadUrl.value
    link.download = itemName.value

    document.body.appendChild(link)
    link.click()
    link.remove()

    isDownloading.value = false
}

watch(
    [token, isDownloadOnly],
    () => {
        if (isDownloadOnly.value) {
            autoDownload()
        }
    },
    { immediate: true }
)

const manualDownload = () => {
    downloadedToken.value = null
    autoDownload()
}

const textContent = ref('')
const textPreviewError = ref(false)

const loadTextPreview = async () => {
    textContent.value = ''
    textPreviewError.value = false

    if (!isText.value) return

    try {
        textContent.value = await $fetch<string>(`/api/shared/${token.value}/preview`)
    } catch {
        textPreviewError.value = true
    }
}

watch(
    [token, isText],
    () => {
        loadTextPreview()
    },
    {
        immediate: true
    }
)
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";

@layer components {
    .download-btn {
        @apply flex-none inline-flex items-center justify-center gap-[0.65rem] py-[0.8rem] px-[1.4rem];
        @apply text-on-primary bg-primary border border-primary rounded-md text-[0.9rem] font-semibold;
        @apply cursor-pointer transition-colors duration-200 hover:bg-primary/85 hover:border-accent;
        @apply focus-visible:outline-2 focus-visible:outline-accent;
        @apply focus-visible:outline-offset-4 disabled:opacity-65 disabled:cursor-wait;
        @apply short-screen:col-start-2 short-screen:mt-0 short-screen:py-[0.65rem] short-screen:px-[1.1rem];
    }
}
</style>
