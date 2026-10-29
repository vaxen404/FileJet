<template>
    <header class="header-bar w-full h-16 flex items-center justify-between py-0 px-4 bg-surface border border-divider
        rounded-xl">
        <button
            type="button"
            class="navigation-toggle hidden max-laptop:grid size-11 shrink-0 place-items-center mr-2 rounded-control border border-control-border bg-control text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Open navigation"
            aria-controls="mobile-navigation"
            aria-haspopup="dialog"
            :aria-expanded="navigationOpen"
            @click="$emit('openNavigation')"
        >
            <Icon name="solar:hamburger-menu-linear" size="24" />
        </button>
        <div class="title flex-1 min-w-0 mr-4">
            <ClientOnly>
                <nav
                    v-if="fileHeader && isFileDetails"
                    class="header-breadcrumb flex items-center gap-3 min-w-0 text-sm leading-normal"
                >
                    <NuxtLink
                        :to="fileHeader.returnPath"
                        class="header-back inline-flex items-center gap-2 shrink-0 text-accent no-underline font-medium
                        hover:text-accent"
                    >
                        <Icon
                            name="solar:arrow-left-linear"
                            size="1.2rem"
                        />
                        <span>Back to {{ fileHeader.returnName }}</span>
                    </NuxtLink>
                    <span class="header-separator text-muted">/</span>
                    <span
                        class="header-filename min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-content"
                        :title="fileHeader.fileName"
                        >{{ fileHeader.fileName }}</span
                    >
                </nav>
                <h1 class="m-0 text-foreground text-2xl font-semibold leading-tight" v-else>{{ title }}</h1>
                <template #fallback>
                    <h1 class="m-0 text-foreground text-2xl font-semibold leading-tight">{{ title }}</h1>
                </template>
            </ClientOnly>
        </div>

        <div class="header-actions header-workspace-actions shrink-0 flex items-center gap-2">
            <NuxtLink to="/home" class="header-storage" :class="{ 'is-full': storage.level !== 'normal' }" :title="`${storageUsed} of ${storageLimit} used`" :aria-label="`Storage: ${storageUsed} of ${storageLimit} used`">
                <Icon name="solar:server-square-linear" size="20" aria-hidden="true" />
                <span class="header-storage-details"><span><span>Storage</span><strong>{{ Math.floor(storage.percent) }}%</strong></span><span class="header-storage-track"><i :style="{ width: `${storage.percent}%` }" /></span></span>
            </NuxtLink>
            <span class="header-action-divider" aria-hidden="true" />
            <button class="header-theme-shortcut" type="button" :disabled="!preferencesLoaded"
                :aria-label="resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                :title="resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')">
                <Icon :name="resolvedTheme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-linear'" size="20" />
            </button>

            <NotificationCenter />

            <div class="header-account hidden max-laptop:block">
                <AccountMenu placement="header" />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import AccountMenu from './AccountMenu.vue'
import NotificationCenter from './NotificationCenter.vue'
import { formatFileSize } from '~/utils/file'
import { getStorageStatus } from '~/utils/notifications'

defineProps({
    navigationOpen: { type: Boolean, default: false },
    title: {
        type: String,
        default: 'Dashboard'
    }
})

defineEmits<{ openNavigation: [] }>()

const fileHeader = useFileHeader()
const route = useRoute()
const currentUser = useAuthUser()
const { user: accountProfile } = useUser()
const { resolvedTheme, setTheme } = useTheme()
const { preferencesLoaded } = usePreferences()
const storageProfile = computed(() => accountProfile.value?.id === currentUser.value?.id ? accountProfile.value : currentUser.value)
const storage = computed(() => getStorageStatus(storageProfile.value?.storageUsed ?? 0, storageProfile.value?.storageLimit ?? 0))
const storageUsed = computed(() => formatFileSize(storageProfile.value?.storageUsed ?? 0))
const storageLimit = computed(() => formatFileSize(storageProfile.value?.storageLimit ?? 0))

const isFileDetails = computed(
    () =>
        /^\/(files|notes|folders)\/[^/]+\/?$/.test(route.path) &&
        fileHeader.value?.fileId ===
            (route.params.id ?? route.params.noteId ?? route.params.folderId)
)
</script>
