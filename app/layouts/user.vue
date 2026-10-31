<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import Sidebar from '~/components/layout/Sidebar.vue'
import HeaderBar from '~/components/layout/HeaderBar.vue'

const route = useRoute()
const navigationDialog = ref<HTMLDialogElement | null>(null)
const mobileMenuOpen = ref(false)
const isCompact = useMediaQuery('(max-width: 1100px)')

const closeNavigation = () => {
    navigationDialog.value?.close()
    mobileMenuOpen.value = false
}

const openNavigation = () => {
    navigationDialog.value?.showModal()
    mobileMenuOpen.value = true
}

watch(() => route.fullPath, closeNavigation)
watch(isCompact, compact => { if (!compact) closeNavigation() })

const pageTitle = computed(() => {
    const titles: Record<string, string> = {
        '/home': 'Dashboard',
        '/files': 'Files',
        '/folders': 'Folders',
        '/notes': 'Notes',
        '/favorites': 'Favorites',
        '/shared': 'Shared',
        '/inbox': 'Inbox',
        '/trash': 'Trash',
        '/settings/preferences': 'Preferences',
        '/settings/personalization': 'Appearance'
    }

    return titles[route.path] || (route.path.startsWith('/inbox/') ? 'Inbox' : 'FileJet')
})

</script>

<template>
    <div class="user-layout flex gap-5 h-dvh p-5 bg-canvas text-foreground max-laptop:gap-0 max-laptop:p-3
        max-mobile:p-2">
        <div class="desktop-navigation min-h-0 shrink-0 max-laptop:hidden">
            <Sidebar />
        </div>

        <dialog
            id="mobile-navigation"
            ref="navigationDialog"
            class="navigation-dialog"
            aria-label="Main navigation"
            @close="mobileMenuOpen = false"
            @click.self="closeNavigation"
        >
            <div class="navigation-sheet" @click="event => { if ((event.target as Element).closest('a')) closeNavigation() }">
                <button type="button" class="navigation-close" aria-label="Close navigation" @click="closeNavigation">
                    <Icon name="solar:close-circle-linear" size="24" />
                </button>
                <Sidebar />
            </div>
        </dialog>

        <div class="user-main flex-1 min-w-0 min-h-0 flex flex-col gap-3">
            <HeaderBar
                :title="pageTitle"
                class="user-header shrink-0"
                :navigation-open="mobileMenuOpen"
                @open-navigation="openNavigation"
            />

            <main
                class="user-content flex-1 min-w-0 min-h-0 p-0 flex flex-col overflow-hidden"
            >
                <slot />
            </main>
        </div>
    </div>
</template>
