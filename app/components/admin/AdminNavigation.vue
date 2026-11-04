<template>
    <div class="flex h-full min-h-0 flex-col gap-8 p-5">
        <NuxtLink to="/admin" aria-label="FileJet administration home" class="flex items-center gap-2 no-underline">
            <BrandMark />
            <div>
                <span class="block text-lg font-bold tracking-tight text-foreground">FileJet</span>
                <span class="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent">Administration</span>
            </div>
        </NuxtLink>

        <nav aria-label="Admin navigation" class="flex-1 space-y-1">
            <p class="mb-3 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Manage instance</p>
            <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to"
                class="admin-nav-link" :class="{ 'is-current': active(item.to) }" :aria-current="active(item.to) ? 'page' : undefined">
                <Icon :name="item.icon" size="20" aria-hidden="true" />
                <span>{{ item.label }}</span>
                <Icon v-if="active(item.to)" name="solar:alt-arrow-right-linear" class="ml-auto" size="14" aria-hidden="true" />
            </NuxtLink>
        </nav>

        <div class="space-y-3 border-t border-divider pt-4">
            <div class="flex min-w-0 items-center gap-3 px-3">
                <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
                    <Icon name="solar:shield-user-linear" size="20" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground">{{ currentUser?.username }}</p>
                    <p class="text-xs text-muted">Administrator</p>
                </div>
            </div>
            <NuxtLink to="/home" class="admin-nav-link">
                <Icon name="solar:arrow-left-linear" size="19" aria-hidden="true" /> Back to workspace
            </NuxtLink>
            <button type="button" class="admin-nav-link w-full text-danger!" :disabled="isSigningOut" @click="requestLogout">
                <Icon name="solar:logout-2-linear" size="19" aria-hidden="true" />
                {{ isSigningOut ? 'Logging out…' : 'Log out' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import BrandMark from '~/components/ui/BrandMark.vue'

const route = useRoute()
const currentUser = useAuthUser()
const { isSigningOut, requestLogout } = useAccountActions()
const navigation = [
    { to: '/admin', label: 'Overview', icon: 'solar:widget-2-linear' },
    { to: '/admin/users', label: 'Users', icon: 'solar:users-group-rounded-linear' },
    { to: '/admin/activity', label: 'Activity history', icon: 'solar:history-linear' }
]
const active = (path: string) => path === '/admin' ? route.path === path : route.path === path || route.path.startsWith(path + '/')
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";
@layer components {
    .admin-nav-link { @apply flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted no-underline cursor-pointer transition-colors hover:bg-control hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed; }
    .admin-nav-link.is-current { @apply bg-accent/12 text-accent; }
}
</style>
