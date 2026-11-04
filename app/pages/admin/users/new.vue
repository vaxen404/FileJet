<template>
    <div class="mx-auto max-w-200 space-y-5">
        <NuxtLink to="/admin/users" class="inline-flex items-center gap-2 text-sm text-muted no-underline hover:text-foreground"><Icon name="solar:arrow-left-linear" size="17" /> Back to users</NuxtLink>
        <div><p class="mb-2 text-xs font-medium text-accent">Account management</p><h1 class="text-2xl font-semibold tracking-tight text-foreground">Add user</h1><p class="mt-2 text-sm text-muted">Create an account and choose its access and storage limit.</p></div>
        <form class="space-y-6 rounded-2xl border border-divider bg-surface p-6 max-mobile:p-4" @submit.prevent="createUser">
            <fieldset :disabled="saving" class="min-w-0 space-y-5">
                <div class="grid grid-cols-2 gap-5 max-mobile:grid-cols-1">
                    <label class="admin-field"><span>Username</span><input v-model="username" type="text" autocomplete="off" required minlength="3" maxlength="50" class="admin-input" /></label>
                    <label class="admin-field"><span>Email <span class="text-muted">(optional)</span></span><input v-model="email" type="email" autocomplete="off" maxlength="255" class="admin-input" /></label>
                    <label class="admin-field"><span>Password</span><input v-model="password" type="password" autocomplete="new-password" required minlength="8" maxlength="100" class="admin-input" /><span class="text-xs text-muted">At least 8 characters.</span></label>
                    <label class="admin-field"><span>Confirm password</span><input v-model="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="100" class="admin-input" /></label>
                    <label class="admin-field"><span>Role</span><select v-model="role" class="admin-input"><option value="USER">User</option><option value="ADMIN">Administrator</option></select><span class="text-xs leading-5 text-muted">Administrators can manage all accounts and delete their data.</span></label>
                    <label class="admin-field"><span>Storage limit (MiB)</span><input v-model="quota" type="number" min="0" step="any" required class="admin-input" /><span class="text-xs text-muted">1,024 MiB = 1 GiB.</span></label>
                </div>
                <p v-if="errorMessage" role="alert" class="text-sm text-danger">{{ errorMessage }}</p>
                <div class="flex flex-wrap gap-3 border-t border-divider pt-5"><button type="submit" class="admin-button bg-primary! text-on-primary!">{{ saving ? 'Creating…' : 'Create user' }}</button><NuxtLink to="/admin/users" class="admin-button no-underline" :aria-disabled="saving" @click="saving && $event.preventDefault()">Cancel</NuxtLink></div>
            </fieldset>
        </form>
    </div>
</template>

<script setup lang="ts">
import { adminQuotaBytes } from '~/utils/adminQuota'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
useHead({ title: 'Add user · FileJet Admin' })
const username = ref(''), email = ref(''), password = ref(''), confirmPassword = ref('')
const role = ref<'USER' | 'ADMIN'>('USER')
const quota = ref<string | number>('1024')
const saving = ref(false), errorMessage = ref('')
const { openToast } = useToast()
const dirty = computed(() => Boolean(username.value || email.value || password.value || confirmPassword.value))
useUnsavedChanges(dirty, saving)
const createUser = async () => {
    if (saving.value) return
    errorMessage.value = ''
    if (password.value !== confirmPassword.value) { errorMessage.value = 'Passwords do not match.'; return }
    let storageLimit: string
    try { storageLimit = adminQuotaBytes(quota.value) }
    catch (error) { errorMessage.value = (error as Error).message; return }
    saving.value = true
    let createdId: string | undefined
    try {
        const result = await $fetch('/api/admin/users', { method: 'POST', body: { username: username.value, email: email.value, password: password.value, confirmPassword: confirmPassword.value, role: role.value, storageLimit } })
        createdId = result.user.id
        username.value = email.value = password.value = confirmPassword.value = ''
        openToast('User created.', 'success')
    } catch (error: any) { errorMessage.value = error?.data?.message || 'Could not create the user.' }
    finally { saving.value = false }
    if (createdId) await navigateTo(`/admin/users/${createdId}`)
}
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";
@layer components {
    .admin-field { @apply flex min-w-0 flex-col gap-2 text-sm text-content; }
    .admin-input { @apply h-11 w-full min-w-0 rounded-lg border border-control-border bg-input px-3 text-sm text-content outline-none focus:border-accent disabled:opacity-50; }
    .admin-button { @apply inline-flex min-h-11 items-center justify-center rounded-lg border border-control-border bg-raised px-4 text-sm text-content cursor-pointer disabled:opacity-50; }
}
</style>
