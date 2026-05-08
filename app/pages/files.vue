<script setup>
import { useSystemStore } from '~/stores/system'

definePageMeta({ middleware: 'auth' })

const username = ref('User')
const files = ref([])
const loading = ref(true)
const fileInput = ref(null) 

const fetchFiles = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/files/user-files', { params: { username: username.value } })
    files.value = data
  } catch (e) {
    console.error("Dosyalar çekilemedi")
  } finally {
    loading.value = false
  }
}

const triggerUpload = () => fileInput.value.click()

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('username', username.value)
  try {
    loading.value = true 
    const response = await $fetch('/api/files/upload', { method: 'POST', body: formData })
    if (response.id) {
      files.value.push(response)
    }
  } catch (e) {
    console.error("Yükleme hatası")
  } finally {
    loading.value = false 
    event.target.value = '' 
  }
}

const viewFile = (storedName) => {
  window.open(`/uploads/${storedName}`, '_blank')
}

const downloadFile = (storedName) => {
  const link = document.createElement('a')
  link.href = `/uploads/${storedName}`
  link.download = storedName
  link.click()
}

const copyFileToClipboard = async (storedName) => {
  try {
    const response = await fetch(`/uploads/${storedName}`);
    if (!response.ok) throw new Error('Dosya alınamadı');
    
    const blob = await response.blob();

    let type = blob.type;
    
    if (storedName.match(/\.(jpg|jpeg)$/i)) {
      type = 'image/jpeg';
    } else if (storedName.match(/\.png$/i)) {
      type = 'image/png';
    }

    const data = [new ClipboardItem({ [type]: blob })];
    await navigator.clipboard.write(data);
    
    alert('Dosya panoya kopyalandı!');
  } catch (err) {
    console.error('Kopyalama hatası ayrıntısı:', err);
    
    alert('Kopyalama başarısız. Tarayıcı bu formatı panoya yazılmasına izin vermiyor olabilir.');
  }
};

const deleteFile = async (fileId, storedName) => {
  if (!confirm(`Silmek istediğine emin misin?`)) return
  try {
    const response = await $fetch('/api/files/delete', { 
      method: 'POST', 
      body: { fileId, fileName: storedName, username: username.value } 
    })
    if (response.success) files.value = files.value.filter(f => f.id !== fileId)
  } catch (e) {
    console.error("Silme hatası")
  }
}

onMounted(async () => {
  const systemStore = useSystemStore()
  const storedName = systemStore.user || localStorage.getItem('username')
  if (storedName) {
    username.value = storedName
    await fetchFiles()
  }
})
</script>

<template>
  <div class="dashboard-wrapper">
    <aside class="sidebar">
      <div class="brand">
        <div class="f-logo">F</div>
        <span class="f-text">FileJet</span>
      </div>
      <nav class="nav-menu">
        <p class="section-title">MAIN MENU</p>
        <NuxtLink to="/home" class="nav-link">🏠 Home</NuxtLink>
        <NuxtLink to="/files" class="nav-link active">📁 Files</NuxtLink>
        <NuxtLink to="/notes" class="nav-link">📝 Notes</NuxtLink>
      </nav>
    </aside>

    <main class="main-body">
      <header class="main-header">
        <div class="header-left">
          <h1>Files</h1>
          <p v-if="!loading">{{ files.length }} dosya bulundu.</p>
        </div>
        
        <div class="header-right">
          <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" />
          <button class="btn-upload" @click="triggerUpload">
            <span class="plus">+</span> Dosya Ekle
          </button>
          <div class="avatar-box">{{ username.charAt(0).toUpperCase() }}</div>
        </div>
      </header>

      <div class="content-card">
        <div v-if="loading" class="state-msg">Yükleniyor...</div>
        <div v-else-if="files.length === 0" class="state-msg">
          <div class="empty-icon">📂</div>
          <p>Henüz hiç dosyan yok. Yukarıdaki butondan eklemeye başla!</p>
        </div>

        <div v-else class="table-responsive">
          <table class="file-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Mime Type</th>
                <th>Size</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in files" :key="file.id">
                <td class="f-name">{{ file.name }}</td>
                <td>{{ file.type }}</td>
                <td>{{ file.size }}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-i" @click="viewFile(file.storedName)">👁️</button>
                    <button class="btn-i" title="Kopyala" @click="copyFileToClipboard(file.storedName)">📋</button>
                    <button class="btn-i" @click="downloadFile(file.storedName)">📥</button>
                    <button class="btn-i btn-red" @click="deleteFile(file.id, file.storedName)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-wrapper { display: flex; width: 100%; min-width: 100%; height: 100vh; background-color: #0f0f12; color: white; overflow: hidden; }
.sidebar { width: 260px; min-width: 260px; max-width: 260px; background: #16161a; border-right: 1px solid #232329; padding: 40px 24px; flex-shrink: 0; }
.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 50px; }
.f-logo { background: #6366f1; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.f-text { font-size: 22px; font-weight: 800; }
.section-title { font-size: 11px; color: #63636e; letter-spacing: 1.5px; margin-bottom: 25px; }
.nav-link { display: flex; align-items: center; gap: 12px; padding: 14px 18px; color: #a1a1aa; text-decoration: none !important; border-radius: 12px; margin-bottom: 8px; }
.nav-link:hover { background: #1f1f24; color: white; }
.nav-link.active { background: #6366f1; color: white; }
.main-body { flex-grow: 1; padding: 48px; overflow-y: auto; background: #0f0f12; }
.main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.header-left h1 { font-size: 32px; margin: 0; }
.header-left p { color: #63636e; margin: 5px 0 0; }
.header-right { display: flex; align-items: center; gap: 20px; }
.btn-upload { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; }
.btn-upload:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); }
.avatar-box { width: 45px; height: 45px; background: #6366f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.content-card { background: #16161a; border: 1px solid #232329; border-radius: 24px; overflow: hidden; }
.file-table { width: 100%; border-collapse: collapse; }
.file-table th { padding: 20px 24px; font-size: 13px; color: #63636e; border-bottom: 1px solid #232329; text-align: left; }
.file-table td { padding: 18px 24px; font-size: 14px; border-bottom: 1px solid #1f1f24; color: #a1a1aa; }
.f-name { color: white; font-weight: 500; }
.action-btns { display: flex; gap: 8px; justify-content: flex-end; }
.btn-i { background: #1f1f24; border: 1px solid #2d2d35; color: white; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.btn-i:hover { border-color: #6366f1; background: #2d2d35; }
.btn-red:hover { color: #ef4444; border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.state-msg { padding: 80px; text-align: center; color: #63636e; }
.empty-icon { font-size: 48px; margin-bottom: 15px; }
</style>
