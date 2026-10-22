<script setup lang="ts">
import Sidebar from '~/components/layout/Sidebar.vue'
import HeaderBar from '~/components/layout/HeaderBar.vue'

const route = useRoute()

const pageTitle = computed(() => {
    const titles: Record<string, string> = {
        '/home': 'Dashboard',
        '/files': 'Files',
        '/folders': 'Folders',
        '/notes': 'Notes',
        '/favorites': 'Favorites',
        '/shared': 'Shared',
        '/trash': 'Trash',
        '/settings/preferences': 'Preferences',
        '/settings/personalization': 'Personalization'
    }

    return titles[route.path] || 'FileJet'
})

const contentClass = computed(() => ({
    'home-content': route.path === '/home',
    'files-content': route.path === '/files',
    'folders-content': route.path === '/folders',
    'notes-content': route.path === '/notes',
    'favorites-content': route.path === '/favorites'
}))
</script>

<template>
    <div class="user-layout flex gap-5 h-screen p-5 bg-canvas text-white">
        <Sidebar />

        <div class="user-main flex-1 min-w-0 min-h-0 flex flex-col gap-3">
            <HeaderBar
                :title="pageTitle"
                class="user-header shrink-0"
            />

            <main
                class="user-content flex-1 min-w-0 min-h-0 p-0 flex flex-col overflow-hidden"
                :class="contentClass"
            >
                <slot />
            </main>
        </div>
    </div>
</template>
