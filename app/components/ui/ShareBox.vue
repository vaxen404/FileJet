<template>
    <section
        class="share-box-card w-full p-4 bg-surface border border-divider rounded-3xl embedded:p-0 embedded:border-0
        embedded:bg-transparent"
        :class="{ embedded }"
    >
        <div
            v-if="!embedded"
            class="share-title flex items-center gap-2 mb-3 text-white text-[0.9rem] font-semibold"
        >
            <Icon name="solar:link-bold" /> Share
        </div>
        <p
            v-if="isLoading"
            class="share-description block mt-0 mr-0 mb-3 ml-0 text-muted text-xs leading-normal"
        >
            Loading share settings...
        </p>
        <div v-else>
            <div
                v-if="state.url"
                class="share-link flex gap-2 mb-2"
            >
                <input class="flex-1 min-w-0 w-full h-10 py-0 px-3 text-[#d5d5da] bg-[#151518] border border-control-border
                    rounded-md text-sm outline-none focus:border-[#5965ed] disabled:opacity-60
                    disabled:cursor-not-allowed leading-[inherit]"
                    :value="state.url"
                    type="text"
                    readonly
                />
                <button
                    type="button"
                    class="copy-btn min-h-10 p-0 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium
                    leading-normal cursor-pointer w-10 shrink-0 bg-raised text-[#d5d5da] border border-control-border
                    hover:bg-[#2a2a2f] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed
                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    title="Copy link"
                    @click="copyShareLink"
                >
                    <Icon :name="copied ? 'solar:check-circle-bold' : 'solar:copy-bold'" />
                </button>
            </div>
            <p class="share-description block mt-0 mr-0 mb-3 ml-0 text-muted text-xs leading-normal">
                {{
                    state.url
                        ? state.isExpired
                            ? 'This link has expired.'
                            : 'Share this link to give access to this item.'
                        : 'Create a share link for this item.'
                }}
            </p>

            <form
                class="share-settings flex flex-col gap-3"
                @submit.prevent="saveSettings"
            >
                <label class="password-toggle text-[#d5d5da] text-sm leading-normal flex items-center gap-2 cursor-pointer">
                    <input class="accent-primary m-0 rounded-sm disabled:opacity-60 disabled:cursor-not-allowed size-4"
                        v-model="passwordEnabled"
                        type="checkbox"
                        :disabled="busy"
                    />
                    <span>Password protection</span>
                </label>
                <div
                    v-if="passwordEnabled"
                    class="setting-field flex flex-col gap-2"
                >
                    <label class="text-[#d5d5da] text-sm leading-normal" :for="`share-password-${itemId}`">{{
                        state.hasPassword ? 'Change password' : 'Link password'
                    }}</label>
                    <input class="w-full min-w-0 h-10 py-0 px-3 text-[#d5d5da] bg-[#151518] border border-control-border rounded-md
                        text-sm outline-none focus:border-[#5965ed] disabled:opacity-60 disabled:cursor-not-allowed
                        leading-[inherit]"
                        :id="`share-password-${itemId}`"
                        v-model="password"
                        type="password"
                        autocomplete="new-password"
                        minlength="4"
                        maxlength="128"
                        :required="!state.hasPassword"
                        :disabled="busy"
                        :placeholder="
                            state.hasPassword
                                ? 'Leave blank to keep the current password'
                                : 'At least 4 characters'
                        "
                    />
                    <span class="setting-help block m-0 text-muted text-xs leading-normal"
                        >The password is verified when opening the link.</span
                    >
                </div>
                <div class="setting-field flex flex-col gap-2">
                    <label class="text-[#d5d5da] text-sm leading-normal" :for="`share-expiration-${itemId}`">Link expiration</label>
                    <select class="w-full min-w-0 h-10 py-0 px-3 text-[#d5d5da] bg-[#151518] border border-control-border rounded-md
                        text-sm outline-none focus:border-[#5965ed] disabled:opacity-60 disabled:cursor-not-allowed
                        leading-[inherit]"
                        :id="`share-expiration-${itemId}`"
                        v-model="expiration"
                        :disabled="busy"
                    >
                        <option value="never">Never</option>
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="custom">Custom expiration date</option>
                    </select>
                    <input class="w-full min-w-0 h-10 py-0 px-3 text-[#d5d5da] bg-[#151518] border border-control-border rounded-md
                        text-sm outline-none focus:border-[#5965ed] disabled:opacity-60 disabled:cursor-not-allowed
                        leading-[inherit]"
                        v-if="expiration === 'custom'"
                        v-model="customExpiration"
                        type="datetime-local"
                        required
                        :disabled="busy"
                    />
                </div>
                <p
                    v-if="errorMessage"
                    class="share-error text-[#ff6b6b] m-0 text-[0.8125rem] leading-normal"
                >
                    {{ errorMessage }}
                </p>
                <p
                    v-if="savedMessage"
                    class="share-description block mt-0 mr-0 mb-3 ml-0 text-muted text-xs leading-normal"
                >
                    {{ savedMessage }}
                </p>
                <div class="share-actions flex items-center flex-wrap gap-2">
                    <button
                        type="submit"
                        class="create-share-btn min-h-10 py-2 px-3 inline-flex items-center justify-center gap-2 rounded-md text-sm
                        font-medium leading-normal cursor-pointer bg-primary text-white border border-primary
                        hover:enabled:bg-[#4652d1] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2
                        focus-visible:outline-accent focus-visible:outline-offset-2"
                        :disabled="busy"
                    >
                        <Icon name="solar:link-circle-bold" />
                        {{ isSaving ? 'Saving...' : state.url ? 'Save settings' : 'Create Link' }}
                    </button>
                    <button
                        v-if="state.url"
                        type="button"
                        class="remove-share-btn min-h-10 py-2 px-3 inline-flex items-center justify-center gap-2 rounded-md text-sm
                        font-medium leading-normal cursor-pointer bg-transparent text-[#ff6b6b] border border-[#4a292d]
                        hover:enabled:bg-[#3a2024] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2
                        focus-visible:outline-accent focus-visible:outline-offset-2"
                        :disabled="busy"
                        @click="removeShareLink"
                    >
                        <Icon name="solar:trash-bin-trash-linear" /> Remove Link
                    </button>
                </div>
            </form>
        </div>
        <button
            v-if="errorMessage && isLoading === false && loadFailed"
            type="button"
            class="create-share-btn min-h-10 py-2 px-3 inline-flex items-center justify-center gap-2 rounded-md text-sm
            font-medium leading-normal cursor-pointer bg-primary text-white border border-primary
            hover:enabled:bg-[#4652d1] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2
            focus-visible:outline-accent focus-visible:outline-offset-2"
            @click="loadShareLink"
        >
            Try again
        </button>
    </section>
</template>

<script setup lang="ts">
import { emptyShareState, type ShareState } from '~~/shared/types/share'

const props = withDefaults(
    defineProps<{
        itemId: string
        itemType: 'file' | 'folder' | 'note'
        initialState?: ShareState
        embedded?: boolean
    }>(),
    { embedded: false }
)

const emit = defineEmits<{ changed: [state: ShareState] }>()
const { openToast } = useToast()
const state = ref<ShareState>(emptyShareState())
const passwordEnabled = ref(false)
const password = ref('')
const expiration = ref('never')
const customExpiration = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')
const loadFailed = ref(false)

const busy = computed(() => isLoading.value || isSaving.value || loadFailed.value)

let requestId = 0
let copyTimer: ReturnType<typeof setTimeout> | undefined

const localDate = (iso: string) => {
    const date = new Date(iso)

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const applyState = (value: ShareState) => {
    state.value = { ...value }
    passwordEnabled.value = value.hasPassword
    password.value = ''
    expiration.value = value.expiresAt ? 'custom' : 'never'
    customExpiration.value = value.expiresAt ? localDate(value.expiresAt) : ''
    copied.value = false
    emit('changed', { ...value })
}

const loadShareLink = async () => {
    const id = ++requestId
    isLoading.value = true
    loadFailed.value = false
    errorMessage.value = ''

    try {
        const value = await $fetch<ShareState>('/api/shared', {
            query: { itemId: props.itemId, itemType: props.itemType }
        })

        if (id === requestId) applyState(value)
    } catch (err: any) {
        if (id === requestId) {
            errorMessage.value = err?.data?.message || 'Could not load share settings.'
            loadFailed.value = true
        }
    } finally {
        if (id === requestId) isLoading.value = false
    }
}

const settingsPayload = () => {
    const passwordAction = passwordEnabled.value ? (password.value ? 'set' : 'keep') : 'remove'

    if (passwordEnabled.value && !state.value.hasPassword && !password.value)
        throw new Error('Enter a password with at least 4 characters.')

    if (
        passwordEnabled.value &&
        password.value &&
        (password.value.length < 4 || password.value.length > 128)
    )
        throw new Error('Password must contain 4–128 characters.')

    let expiresAt: string | null = null

    if (expiration.value === 'custom') {
        if (!customExpiration.value) throw new Error('Select an expiration date.')

        expiresAt =
            state.value.expiresAt && localDate(state.value.expiresAt) === customExpiration.value
                ? state.value.expiresAt
                : new Date(customExpiration.value).toISOString()
    } else if (expiration.value !== 'never')
        expiresAt = new Date(Date.now() + Number(expiration.value) * 86400000).toISOString()

    if (
        expiresAt &&
        expiresAt !== state.value.expiresAt &&
        new Date(expiresAt).getTime() <= Date.now()
    )
        throw new Error('Expiration must be in the future.')

    return {
        passwordAction,
        ...(passwordAction === 'set' ? { password: password.value } : {}),
        expiresAt
    }
}

const saveSettings = async () => {
    if (busy.value) return

    errorMessage.value = ''
    savedMessage.value = ''
    let settings

    try {
        settings = settingsPayload()
    } catch (err: any) {
        errorMessage.value = err.message

        return
    }

    const id = ++requestId
    isSaving.value = true

    try {
        const value = state.value.url
            ? await $fetch<ShareState>(
                  `/api/shared/items/${props.itemType}/${encodeURIComponent(props.itemId)}`,
                  { method: 'PATCH', body: settings }
              )
            : await $fetch<ShareState>('/api/shared', {
                  method: 'POST',
                  body: { itemId: props.itemId, itemType: props.itemType, ...settings }
              })

        if (id !== requestId) return

        applyState(value)
        savedMessage.value = 'Share settings saved.'
        openToast(savedMessage.value, 'success')
    } catch (err: any) {
        if (id === requestId)
            errorMessage.value =
                err?.data?.message || err?.message || 'Could not save share settings.'
    } finally {
        if (id === requestId) isSaving.value = false
    }
}

const removeShareLink = async () => {
    if (busy.value) return

    const id = ++requestId
    isSaving.value = true
    errorMessage.value = ''
    savedMessage.value = ''

    try {
        await $fetch(`/api/shared/items/${props.itemType}/${encodeURIComponent(props.itemId)}`, {
            method: 'DELETE'
        })

        if (id !== requestId) return

        applyState(emptyShareState())
        openToast('Share link removed successfully.', 'success')
    } catch (err: any) {
        if (id === requestId)
            errorMessage.value = err?.data?.message || 'Could not remove share link.'
    } finally {
        if (id === requestId) isSaving.value = false
    }
}

const copyShareLink = async () => {
    if (!state.value.url) return

    try {
        await navigator.clipboard.writeText(state.value.url)
        copied.value = true
        clearTimeout(copyTimer)
        copyTimer = setTimeout(() => {
            copied.value = false
        }, 1500)
        openToast('Share link copied.', 'success')
    } catch {
        openToast('Could not copy share link.', 'error')
    }
}

watch(
    () => [props.itemId, props.itemType],
    () => {
        requestId++
        isSaving.value = false
        errorMessage.value = ''
        savedMessage.value = ''

        if (props.initialState !== undefined) applyState(props.initialState)
        else loadShareLink()
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    requestId++
    clearTimeout(copyTimer)
})
</script>
