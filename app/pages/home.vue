<script setup>
import { ref, onMounted } from 'vue'
import { useSystemStore } from '~/stores/system'

definePageMeta({ middleware: 'auth' })

const username = ref('User')
const stats = ref({ totalFiles: 0, totalNotes: 0, totalUsers: 0 })

onMounted(async () => {
    const systemStore = useSystemStore()
    const storedName = systemStore.user || localStorage.getItem('username')
    if (storedName) username.value = storedName

    try {
        const data = await $fetch('/api/files/user-stats', { params: { username: username.value } })
        stats.value = data
    } catch (e) {
        console.error("İstatistikler yüklenemedi.")
    }
})
</script>

<template>
  <div class="grid-container">
    <aside class="sidebar-area">
      <div class="brand-box">
        <div class="logo-circle">F</div>
        <span class="logo-name">FileJet</span>
      </div>
      
      <nav class="side-nav">
        <p class="nav-header">MAIN MENU</p>
        <NuxtLink to="/home" class="nav-item active">🏠 Home</NuxtLink>
        <NuxtLink to="/files" class="nav-item">📁 Files</NuxtLink>
        <NuxtLink to="/notes" class="nav-item">📝 Notes</NuxtLink>
      </nav>
    </aside>

    <div class="main-panel">
      <header class="header-bar">
        <div class="title-group">
          <h1>Your Statistics</h1>
          <p>Sistem genelindeki güncel durumunuz.</p>
        </div>
        <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
      </header>

      <main class="stats-viewport">
        <div class="stats-layout">
          <div class="stat-box">
            <div class="box-top">
              <span class="box-label">FILES</span>
              <span class="box-icon">📁</span>
            </div>
            <div class="box-number">{{ stats.totalFiles }}</div>
            <div class="box-info">uploaded files</div>
          </div>

          <div class="stat-box">
            <div class="box-top">
              <span class="box-label">NOTES</span>
              <span class="box-icon">📝</span>
            </div>
            <div class="box-number">{{ stats.totalNotes }}</div>
            <div class="box-info">total notes</div>
          </div>

          <div class="stat-box">
            <div class="box-top">
              <span class="box-label">USERS</span>
              <span class="box-icon">👤</span>
            </div>
            <div class="box-number">{{ stats.totalUsers }}</div>
            <div class="box-info">total users</div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
html, body, #__nuxt {
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
  background: #0f0f12;
  overflow: hidden; 
}
</style>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: 260px 1fr;
  width: 100%;
  min-width: 100%;
  height: 100vh;
  background: #0f0f12;
  color: white;
}

.sidebar-area {
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  box-sizing: border-box;
  background: #16161a;
  border-right: 1px solid #232329;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
}

.main-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden; 
}

.header-bar {
  padding: 40px 60px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-bar h1 { font-size: 30px; margin: 0; font-weight: 800; }
.header-bar p { color: #71717a; margin: 8px 0 0; }

.user-avatar {
  width: 44px; height: 44px; background: #6366f1; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-weight: bold;
}

.stats-viewport {
  padding: 20px 60px 60px;
  overflow-y: auto; 
}

.stats-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr); 
  gap: 20px;
}

.stat-box {
  background: #16161a;
  border: 1px solid #232329;
  border-radius: 16px;
  padding: 30px;
  transition: 0.3s;
}

.stat-box:hover { border-color: #6366f1; transform: translateY(-4px); }

.box-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.box-label { font-size: 11px; font-weight: 800; color: #71717a; letter-spacing: 1px; }
.box-icon { opacity: 0.8; font-size: 20px; color: #6366f1; }
.box-number { font-size: 44px; font-weight: 800; margin-bottom: 5px; }
.box-info { font-size: 13px; color: #52525b; }

.brand-box { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
.logo-circle { background: #6366f1; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.logo-name { font-size: 22px; font-weight: 800; }
.nav-header { font-size: 11px; color: #52525b; letter-spacing: 1.5px; margin-bottom: 24px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; color: #a1a1aa; text-decoration: none; border-radius: 12px; margin-bottom: 8px; font-size: 15px; }
.nav-item.active { background: #6366f1; color: white; }
</style>