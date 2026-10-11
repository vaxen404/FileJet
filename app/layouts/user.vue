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
  <div class="user-layout">
    <Sidebar />

    <div class="user-main">
      <HeaderBar :title="pageTitle" class="user-header" />

      <main class="user-content" :class="contentClass">
        <slot />
      </main>
    </div>
  </div>
</template>

<style>
html,
body,
#__nuxt {
  margin: 0;
  width: 100%;
  height: 100%;
}

body {
  overflow: hidden;
}
</style>

<style scoped>
.user-layout {
  display: flex;
  gap: 1.25rem;

  height: 100vh;
  padding: 1.25rem;

  box-sizing: border-box;

  background: #121214;
  color: white;
}

.user-main {
  flex: 1;
  min-width: 0;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.user-content {
  flex: 1;
  min-height: 0;

  padding: 0rem;

  overflow: auto;
}

.user-header {
  flex-shrink: 0;
}

.files-content,
.folders-content,
.notes-content {
  flex: 1;
  min-width: 0;
  min-height: 0;

  display: flex;
  flex-direction: column;

  overflow: hidden;
}

.home-content {
  padding: 0.5rem;
  overflow: hidden;
}


</style>
