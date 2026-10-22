<template>
    <section
        class="share-box-card"
        :class="{ embedded }"
    >
        <div
            v-if="!embedded"
            class="share-title"
        >
            <Icon name="solar:link-bold" /> Share
        </div>
        <p
            v-if="isLoading"
            class="share-description"
        >
            Loading share settings...
        </p>
        <div v-else>
            <div
                v-if="state.url"
                class="share-link"
            >
                <input
                    :value="state.url"
                    type="text"
                    readonly
                />
                <button
                    type="button"
                    class="copy-btn"
                    title="Copy link"
                    @click="copyShareLink"
                >
                    <Icon :name="copied ? 'solar:check-circle-bold' : 'solar:copy-bold'" />
                </button>
            </div>
            <p class="share-description">
                {{
                    state.url
                        ? state.isExpired
                            ? 'This link has expired.'
                            : 'Share this link to give access to this item.'
                        : 'Create a share link for this item.'
                }}
            </p>

            <form
                class="share-settings"
                @submit.prevent="saveSettings"
            >
                <label class="password-toggle">
                    <input
                        v-model="passwordEnabled"
                        type="checkbox"
                        :disabled="busy"
                    />
                    <span>Password protection</span>
                </label>
                <div
                    v-if="passwordEnabled"
                    class="setting-field"
                >
                    <label :for="`share-password-${itemId}`">{{
                        state.hasPassword ? 'Change password' : 'Link password'
                    }}</label>
                    <input
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
                    <span class="setting-help"
                        >The password is verified when opening the link.</span
                    >
                </div>
                <div class="setting-field">
                    <label :for="`share-expiration-${itemId}`">Link expiration</label>
                    <select
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
                    <input
                        v-if="expiration === 'custom'"
                        v-model="customExpiration"
                        type="datetime-local"
                        required
                        :disabled="busy"
                    />
                </div>
                <p
                    v-if="errorMessage"
                    class="share-error"
                >
                    {{ errorMessage }}
                </p>
                <p
                    v-if="savedMessage"
                    class="share-description"
                >
                    {{ savedMessage }}
                </p>
                <div class="share-actions">
                    <button
                        type="submit"
                        class="create-share-btn"
                        :disabled="busy"
                    >
                        <Icon name="solar:link-circle-bold" />
                        {{ isSaving ? 'Saving...' : state.url ? 'Save settings' : 'Create Link' }}
                    </button>
                    <button
                        v-if="state.url"
                        type="button"
                        class="remove-share-btn"
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
            class="create-share-btn"
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

<style scoped>
.share-box-card {
    width: 100%;
    padding: 1rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;
    box-sizing: border-box;
}

.share-box-card.embedded {
    padding: 0;
    border: none;
    background: transparent;
}

.share-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 600;
}

.share-description,
.setting-help {
    display: block;
    margin: 0 0 0.75rem;
    color: #898991;
    font-size: 0.75rem;
    line-height: 1.5;
}

.share-link {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.share-link input {
    flex: 1;
    min-width: 0;
}

.share-settings {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.setting-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.setting-field label,
.password-toggle {
    color: #d5d5da;
    font-size: 0.875rem;
    line-height: 1.5;
}

.password-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.password-toggle input {
    accent-color: #3c47be;
    width: 1rem;
    height: 1rem;
    margin: 0;
    border-radius: 4px;
}

.setting-help {
    margin: 0;
}

.setting-field input,
.setting-field select,
.share-link input {
    width: 100%;
    min-width: 0;
    height: 2.5rem;
    padding: 0 0.75rem;
    color: #d5d5da;
    background: #151518;
    border: 1px solid #303036;
    border-radius: 6px;
    box-sizing: border-box;
    font: inherit;
    font-size: 0.875rem;
    outline: none;
}

.setting-field input:focus,
.setting-field select:focus,
.share-link input:focus {
    border-color: #5965ed;
}

.share-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.create-share-btn,
.remove-share-btn,
.copy-btn {
    min-height: 2.5rem;
    padding: 0.5rem 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    box-sizing: border-box;
}

.create-share-btn {
    background: #3c47be;
    color: #ffffff;
    border: 1px solid #3c47be;
}

.create-share-btn:hover:not(:disabled) {
    background: #4652d1;
}

.remove-share-btn {
    background: transparent;
    color: #ff6b6b;
    border: 1px solid #4a292d;
}

.remove-share-btn:hover:not(:disabled) {
    background: #3a2024;
}

.copy-btn {
    width: 2.5rem;
    flex-shrink: 0;
    padding: 0;
    background: #242429;
    color: #d5d5da;
    border: 1px solid #303036;
}

.copy-btn:hover {
    background: #2a2a2f;
    color: #ffffff;
}

.share-error {
    color: #ff6b6b;
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
}

button:disabled,
input:disabled,
select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

button:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 2px;
}
</style>
