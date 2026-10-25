<template>
    <section aria-label="Account settings" class="mb-5">
        <div class="space-y-5">
            <details class="account-card group" open>
                <summary class="account-card-heading">
                    <span>Profile</span>
                    <Icon name="solar:alt-arrow-down-linear" size="18" aria-hidden="true" class="text-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <form @submit.prevent="saveProfile">
                    <fieldset :disabled="saving" class="min-w-0">
                        <div class="space-y-4 p-5">
                            <div>
                                <label for="account-username" class="account-label">Username</label>
                                <input id="account-username" v-model="profile.username" type="text" autocomplete="username" minlength="3" maxlength="50" required class="account-input">
                            </div>
                            <div>
                                <label for="account-email" class="account-label">Email address <span class="font-normal text-muted">(optional)</span></label>
                                <input id="account-email" v-model="profile.email" type="email" autocomplete="email" maxlength="255" placeholder="you@example.com" class="account-input">
                            </div>
                        </div>

                        <div class="account-card-footer">
                            <button type="button" :disabled="!profileDirty" class="account-cancel" @click="resetProfile">Cancel</button>
                            <button type="submit" :disabled="!profileChanged" class="account-save">
                                <Icon :name="profileSaving ? 'solar:refresh-linear' : 'solar:check-read-linear'" size="16" :class="{ 'animate-spin': profileSaving }" />
                                {{ profileSaving ? 'Saving…' : 'Save profile' }}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </details>

            <details class="account-card group">
                <summary class="account-card-heading">
                    <span>Password</span>
                    <Icon name="solar:alt-arrow-down-linear" size="18" aria-hidden="true" class="text-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <form @submit.prevent="changePassword">
                    <fieldset :disabled="saving" class="min-w-0">
                        <div class="space-y-4 p-5">
                            <div>
                                <label for="password-current" class="account-label">Current password</label>
                                <input id="password-current" v-model="password.currentPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="current-password" maxlength="100" required class="account-input">
                            </div>
                            <div>
                                <label for="password-new" class="account-label">New password</label>
                                <input id="password-new" v-model="password.newPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="100" required class="account-input">
                            </div>
                            <div>
                                <label for="password-confirm" class="account-label">Confirm new password</label>
                                <input id="password-confirm" v-model="password.confirmPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="100" required aria-describedby="new-password-hint" class="account-input">
                                <p id="new-password-hint" class="mt-2 text-[11px] leading-5 text-muted">8–100 characters. Your new passwords must match.</p>
                            </div>
                            <label class="flex w-fit cursor-pointer items-center gap-2 text-xs text-label">
                                <input v-model="showPasswords" type="checkbox" class="file-checkbox">
                                Show passwords
                            </label>
                        </div>

                        <div class="account-card-footer">
                            <button type="button" :disabled="!passwordDirty" class="account-cancel" @click="resetPassword">Clear</button>
                            <button type="submit" :disabled="!passwordDirty" class="account-save">
                                <Icon :name="passwordSaving ? 'solar:refresh-linear' : 'solar:lock-password-linear'" size="16" :class="{ 'animate-spin': passwordSaving }" />
                                {{ passwordSaving ? 'Updating…' : 'Update password' }}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </details>
        </div>
    </section>
</template>

<script setup lang="ts">
import { accountProfileSchema, passwordChangeSchema } from '~~/shared/schemas/account'

const emit = defineEmits<{
    'state-change': [state: { dirty: boolean; saving: boolean }]
}>()

const currentUser = useAuthUser()
const { user } = useUser()
const { openToast } = useToast()
const profile = reactive({ username: currentUser.value?.username ?? '', email: currentUser.value?.email ?? '' })
const password = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const profileSaving = ref(false)
const passwordSaving = ref(false)
const showPasswords = ref(false)
const saving = computed(() => profileSaving.value || passwordSaving.value)
const profileChanged = computed(() => profile.username.trim() !== (currentUser.value?.username ?? '')
    || profile.email.trim().toLowerCase() !== (currentUser.value?.email?.toLowerCase() ?? ''))
const profileDirty = profileChanged
const passwordDirty = computed(() => Boolean(password.currentPassword || password.newPassword || password.confirmPassword))

watch([profileDirty, passwordDirty, saving], () => {
    emit('state-change', { dirty: profileDirty.value || passwordDirty.value, saving: saving.value })
}, { immediate: true })

const resetProfile = () => {
    profile.username = currentUser.value?.username ?? ''
    profile.email = currentUser.value?.email ?? ''
}

const resetPassword = () => {
    password.currentPassword = ''
    password.newPassword = ''
    password.confirmPassword = ''
    showPasswords.value = false
}

const saveProfile = async () => {
    if (saving.value || !profileChanged.value) return

    const parsed = accountProfileSchema.safeParse(profile)

    if (!parsed.success) {
        openToast(parsed.error.issues[0]?.message || 'Check your account details.', 'error')
        return
    }

    profileSaving.value = true

    try {
        const response = await $fetch('/api/users/@me', {
            method: 'PATCH',
            body: { ...parsed.data, email: parsed.data.email ?? '' }
        })

        currentUser.value = response.user
        user.value = response.user
        resetProfile()
        openToast('Your account details have been updated.', 'success')
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Your account details could not be updated.', 'error')
    } finally {
        profileSaving.value = false
    }
}

const changePassword = async () => {
    if (saving.value || !passwordDirty.value) return

    const parsed = passwordChangeSchema.safeParse(password)

    if (!parsed.success) {
        openToast(parsed.error.issues[0]?.message || 'Check your password details.', 'error')
        return
    }

    passwordSaving.value = true

    try {
        await $fetch('/api/users/@me/password', { method: 'PATCH', body: parsed.data })
        resetPassword()
        openToast('Your password has been updated.', 'success')
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Your password could not be updated.', 'error')
    } finally {
        passwordSaving.value = false
    }
}
</script>

<style scoped>
@reference "../../assets/css/tailwind.css";

.account-card {
    @apply overflow-hidden rounded-xl border border-divider bg-surface;
}
.account-card-heading {
    @apply flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent;
}
.account-card-heading::-webkit-details-marker {
    display: none;
}
.account-card[open] > .account-card-heading {
    @apply border-b border-divider;
}
.account-label {
    @apply mb-2 block text-xs font-medium text-secondary;
}
.account-input {
    @apply h-10 w-full rounded-control border border-control-border bg-control px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15;
}
.account-card-footer {
    @apply flex items-center justify-end gap-3 border-t border-divider bg-control/20 px-5 py-4;
}
.account-save {
    @apply inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-control border border-primary bg-primary px-4 text-xs font-medium text-white hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
.account-cancel {
    @apply h-10 cursor-pointer rounded-control border border-control-border bg-control px-4 text-xs font-medium text-label hover:enabled:bg-raised disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
