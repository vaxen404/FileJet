<template>
    <div class="space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="mb-2 text-xs font-medium text-accent">Account management</p>
                    <h1 class="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                    <p class="mt-1 text-sm text-muted">Manage account roles and storage limits.</p>
                </div>
                <button class="admin-button" :disabled="pending || saving" @click="refreshUsers()">Refresh</button>
            </div>

            <p v-if="error" role="alert" class="rounded-xl border border-danger-border bg-danger-surface p-4 text-sm text-danger">Could not load administration data. Try Refresh.</p>
            <section v-if="selected" class="rounded-xl border border-accent/40 bg-surface p-5">
                <form class="space-y-4" @submit.prevent="saveUser">
                    <div>
                        <h2 class="text-sm font-semibold text-foreground">Edit {{ selected.username }}</h2>
                        <p class="mt-1 text-xs text-muted">Currently using {{ formatFileSize(selected.storageUsed) }}. Your own administrator role cannot be removed.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4 max-mobile:grid-cols-1">
                        <label class="space-y-2 text-sm text-content">
                            <span class="block">Role</span>
                            <select v-model="draftRole" class="admin-input" :disabled="saving || selected.id === currentUser?.id">
                                <option value="USER">User</option><option value="ADMIN">Administrator</option>
                            </select>
                        </label>
                        <label class="space-y-2 text-sm text-content">
                            <span class="block">Storage limit (MiB)</span>
                            <input v-model="draftQuota" type="number" min="0" step="any" required class="admin-input" :disabled="saving" />
                            <span class="block text-xs text-muted">1,024 MiB = 1 GiB. The limit must cover current usage.</span>
                        </label>
                    </div>
                    <p v-if="saveError" role="alert" class="text-sm text-danger">{{ saveError }}</p>
                    <div class="flex gap-2">
                        <button type="submit" class="admin-button bg-primary! text-on-primary!" :disabled="saving">{{ saving ? 'Saving...' : 'Save changes' }}</button>
                        <button type="button" class="admin-button" :disabled="saving" @click="selected = null">Cancel</button>
                    </div>
                </form>
            </section>

            <section class="overflow-hidden rounded-xl border border-divider bg-surface">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-divider p-4">
                    <h2 class="text-sm font-semibold text-foreground">Users <span class="text-muted">({{ data?.total ?? 0 }})</span></h2>
                    <form class="flex min-w-0 flex-wrap gap-2" @submit.prevent="applySearch">
                        <input v-model="searchDraft" aria-label="Search users" maxlength="100" placeholder="Username or email" type="search" class="admin-input w-60! max-mobile:w-full!" />
                        <button type="submit" class="admin-button" :disabled="saving">Search</button>
                    </form>
                </div>
                <p v-if="pending" role="status" class="p-5 text-sm text-muted">Loading users...</p>
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="text-xs text-muted"><tr>
                            <th class="p-4 font-medium">Account</th><th class="p-4 font-medium">Role</th>
                            <th class="p-4 font-medium">Storage</th><th class="p-4 font-medium"><span class="sr-only">Actions</span></th>
                        </tr></thead>
                        <tbody>
                            <tr v-for="user in data?.users" :key="user.id" class="border-t border-divider">
                                <td class="p-4"><p class="font-medium text-foreground wrap-anywhere">{{ user.username }} <span v-if="user.id === currentUser?.id" class="text-xs text-muted">(you)</span></p><p class="mt-1 text-xs text-muted wrap-anywhere">{{ user.email || 'No email' }}</p></td>
                                <td class="p-4"><span class="rounded-md bg-control px-2 py-1 text-xs text-content">{{ user.role === 'ADMIN' ? 'Admin' : 'User' }}</span></td>
                                <td class="p-4 text-xs text-content whitespace-nowrap">{{ formatFileSize(user.storageUsed) }} / {{ formatFileSize(user.storageLimit) }}</td>
                                <td class="p-4 text-right"><button class="admin-button" :aria-label="`Edit ${user.username}`" :disabled="saving" @click="editUser(user)">Edit</button></td>
                            </tr>
                            <tr v-if="!data?.users.length"><td colspan="4" class="p-6 text-center text-muted">No users found.</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex items-center justify-between gap-2 border-t border-divider p-4 text-xs text-muted">
                    <span>Page {{ page }} of {{ totalPages }}</span>
                    <div class="flex gap-2"><button class="admin-button" :disabled="page <= 1 || pending || saving" @click="page--">Previous</button><button class="admin-button" :disabled="page >= totalPages || pending || saving" @click="page++">Next</button></div>
                </div>
            </section>
    </div>
</template>

<script setup lang="ts">
import { formatFileSize } from '~/utils/file'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
useHead({ title: 'Users · FileJet Admin' })
const currentUser = useAuthUser()
const { openToast } = useToast()
const page = ref(1)
const search = ref('')
const searchDraft = ref('')
const { data, error, pending, refresh: refreshUsers } = await useFetch('/api/admin/users', { query: { page, search } })
type AdminUser = NonNullable<typeof data.value>['users'][number]
const selected = ref<AdminUser | null>(null)
const draftRole = ref<'USER' | 'ADMIN'>('USER')
const draftQuota = ref('')
const originalQuota = ref('')
const saving = ref(false)
const saveError = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / 25)))
const applySearch = () => { page.value = 1; search.value = searchDraft.value.trim() }
const editUser = (user: AdminUser) => {
    selected.value = user
    draftRole.value = user.role
    draftQuota.value = originalQuota.value = String(Number(user.storageLimit) / 1048576)
    saveError.value = ''
}
const saveUser = async () => {
    if (!selected.value || saving.value) return
    saveError.value = ''
    let storageLimit = selected.value.storageLimit
    const quota = String(draftQuota.value)
    if (quota !== originalQuota.value) {
        if (!/^\d+(?:\.\d{1,6})?$/.test(quota)) { saveError.value = 'Enter a non-negative MiB value with up to six decimal places.'; return }
        const [whole, fraction = ''] = quota.split('.')
        storageLimit = ((BigInt(whole!) * 1000000n + BigInt(fraction.padEnd(6, '0'))) * 1048576n / 1000000n).toString()
    }
    saving.value = true
    try {
        const result = await $fetch(`/api/admin/users/${selected.value.id}`, { method: 'PATCH', body: { role: draftRole.value, storageLimit } })
        if (currentUser.value?.id === result.user.id) currentUser.value = { ...currentUser.value, role: result.user.role, storageLimit: result.user.storageLimit }
        selected.value = null
        openToast('User settings saved.', 'success')
        await refreshUsers()
    } catch (error: any) { saveError.value = error?.data?.message || 'Could not save user settings.' }
    finally { saving.value = false }
}
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";
@layer components {
    .admin-button { @apply min-h-10 rounded-lg border border-control-border bg-raised px-3 text-sm text-content cursor-pointer hover:bg-control disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent; }
    .admin-input { @apply block h-10 w-full min-w-0 rounded-lg border border-control-border bg-input px-3 text-sm text-content outline-none focus:border-accent disabled:opacity-50; }
}
</style>
