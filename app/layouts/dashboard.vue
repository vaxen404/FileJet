<script setup lang="ts">
const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
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
  'dashboard-content': true,
  'files-content': route.path === '/files',
  'folders-content': route.path === '/folders'
}))

</script>

<template>
  <div class="dashboard-layout">
    <Sidebar />

    <div class="dashboard-main">
      <HeaderBar :title="pageTitle" />

      <main :class="contentClass">
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
.dashboard-layout {
  display: flex;
  gap: 1.25rem;

  height: 100vh;
  padding: 1.25rem;

  box-sizing: border-box;

  background: #121214;
  color: white;
}

.dashboard-main {
  flex: 1;
  min-width: 0;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dashboard-content {
  flex: 1;
  min-height: 0;

  padding: 2rem;

  overflow: auto;
}

.files-content,
.folders-content {
  padding: 0;
  overflow: hidden;
}
</style>
