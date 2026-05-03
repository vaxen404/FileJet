<script setup>
import { ref, onMounted, computed } from 'vue'
import { NoteSchema } from '../utils/schemas'
import { useSystemStore } from '~/stores/system'

definePageMeta({ middleware: 'auth' })

const username = ref('User')
const notes = ref([])
const loading = ref(true)
const errorMsg = ref('')
const searchQuery = ref('')
const showModal = ref(false)
const isEditing = ref(false)
const currentNoteId = ref(null)
const noteForm = ref({ title: '', content: '' })
const currentPage = ref(1)
const notesPerPage = 12

const fetchNotes = async () => {
    loading.value = true
    try {
        const data = await $fetch('/api/notes/list', { params: { username: username.value } })
        notes.value = data || []
    } catch (error) {
        errorMsg.value = "Notlar yüklenirken bir hata oluştu."
    } finally {
        loading.value = false
    }
}

const saveNote = async () => {
    errorMsg.value = ''
    const result = NoteSchema.safeParse(noteForm.value)
    if (!result.success) {
        errorMsg.value = result.error.issues[0].message
        return
    }
    const url = isEditing.value ? '/api/notes/update' : '/api/notes/upload'
    const method = isEditing.value ? 'PUT' : 'POST'
    const body = { ...result.data, username: username.value }
    if (isEditing.value) body.noteId = currentNoteId.value
    try {
        await $fetch(url, { method, body })
        await fetchNotes()
        showModal.value = false
    } catch (error) {
        errorMsg.value = error.statusMessage || 'İşlem başarısız.'
    }
}

const openEditModal = (note) => {
    errorMsg.value = ''
    isEditing.value = true
    currentNoteId.value = note.id
    noteForm.value = { title: note.title, content: note.content }
    showModal.value = true
}

const deleteNote = async (id) => {
    if (!confirm('Bu notu silmek istediğine emin misin?')) return
    try {
        await $fetch('/api/notes/delete', { method: 'DELETE', body: { noteId: id, username: username.value } })
        notes.value = notes.value.filter(n => n.id !== id)
    } catch (error) {
        errorMsg.value = 'Silme işlemi başarısız.'
    }
}

const filteredNotes = computed(() => {
    if (!searchQuery.value) return notes.value
    return notes.value.filter(n => n.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const totalPages = computed(() => Math.ceil(filteredNotes.value.length / notesPerPage) || 1)
const paginatedNotes = computed(() => {
    const start = (currentPage.value - 1) * notesPerPage
    return filteredNotes.value.slice(start, start + notesPerPage)
})

onMounted(async () => {
    const systemStore = useSystemStore() // HATA ÇÖZÜMÜ: Buraya taşındı!
    const storedName = systemStore.user || localStorage.getItem('username')
    if (storedName) {
        username.value = storedName
        await fetchNotes()
    }
})
</script>

<template>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <div class="brand-section">
        <div class="brand-icon">F</div>
        <span class="brand-name">FileJet</span>
      </div>
      
      <nav class="nav-list">
        <p class="nav-label">MAIN MENU</p>
        <NuxtLink to="/home" class="nav-item">🏠 Home</NuxtLink>
        <NuxtLink to="/files" class="nav-item">📁 Files</NuxtLink>
        <NuxtLink to="/notes" class="nav-item active">📝 Notes</NuxtLink>
      </nav>
    </aside>

    <div class="main-container">
      <header class="top-bar">
        <div class="page-info">
          <h1>Notes</h1>
          <span v-if="!loading" class="count-tag">{{ filteredNotes.length }} not bulundu</span>
        </div>
        
        <div class="top-actions">
          <div class="search-box">
            <span class="icon">🔍</span>
            <input v-model="searchQuery" type="text" placeholder="Notlarda ara..." />
          </div>
          <div class="user-profile">{{ username.charAt(0).toUpperCase() }}</div>
        </div>
      </header>

      <main class="scrollable-content">
        <div v-if="errorMsg && !showModal" class="error-box global-error">
          <span class="error-icon">⚠️</span>
          {{ errorMsg }}
        </div>

        <div v-if="loading" class="loading-state">Notlar yükleniyor...</div>

        <div v-else class="notes-grid">
          <div class="card add-new" @click="isEditing = false; noteForm = {title:'', content:''}; errorMsg=''; showModal = true">
            <div class="plus">+</div>
            <p>Yeni Not Oluştur</p>
          </div>

          <div v-for="note in paginatedNotes" :key="note.id" class="card note-card">
            <div class="card-body" @click="openEditModal(note)">
              <h3 class="title">{{ note.title }}</h3>
              <p class="preview">{{ note.content.substring(0, 50) }}...</p>
            </div>
            <div class="card-footer">
              <span class="date">{{ note.createdAt || '03.05.2026' }}</span>
              <div class="btns">
                <button class="icon-btn red" @click="deleteNote(note.id)">🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button @click="currentPage--" :disabled="currentPage === 1">‹</button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages">›</button>
        </div>
      </main>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal-content">
        <h2>{{ isEditing ? 'Notu Düzenle' : 'Yeni Not' }}</h2>
        
        <div v-if="errorMsg" class="error-box">
          <span class="error-icon">⚠️</span>
          {{ errorMsg }}
        </div>

        <div class="form">
          <input v-model="noteForm.title" placeholder="Başlık..." :class="{'input-err': errorMsg && noteForm.title.length < 3}" />
          <textarea v-model="noteForm.content" placeholder="İçerik..." :class="{'input-err': errorMsg && !noteForm.content}"></textarea>
        </div>
        
        <div class="modal-btns">
          <button @click="showModal = false" class="btn-cancel">İptal</button>
          <button @click="saveNote" class="btn-save">{{ isEditing ? 'Güncelle' : 'Oluştur' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  width: 100%;
  min-width: 100%;
  height: 100vh;
  background: #0f0f12;
  color: white;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  box-sizing: border-box;
  background: #16161a;
  border-right: 1px solid #232329;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.brand-icon {
  background: #6366f1;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
}

.brand-name { font-size: 22px; font-weight: 800; }
.nav-label { font-size: 11px; color: #52525b; letter-spacing: 1px; margin-bottom: 20px; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #a1a1aa;
  text-decoration: none;
  border-radius: 12px;
  margin-bottom: 6px;
  transition: 0.2s;
}

.nav-item:hover { background: rgba(255,255,255,0.03); color: white; }
.nav-item.active { background: #6366f1; color: white; }

.main-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.top-bar {
  padding: 30px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-info h1 { font-size: 28px; margin: 0; }
.count-tag { font-size: 14px; color: #71717a; margin-top: 4px; display: block; }

.top-actions { display: flex; align-items: center; gap: 20px; }
.search-box {
  background: #16161a;
  border: 1px solid #232329;
  padding: 10px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 280px;
}

.search-box input { background: transparent; border: none; color: white; outline: none; width: 100%; }
.user-profile {
  width: 44px;
  height: 44px;
  background: #6366f1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.scrollable-content {
  padding: 0 40px 40px 40px;
  overflow-y: auto;
  flex-grow: 1;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.card {
  background: #16161a;
  border: 1px solid #232329;
  border-radius: 20px;
  padding: 24px;
  height: 180px;
  display: flex;
  flex-direction: column;
  transition: 0.3s;
  cursor: pointer;
}

.card:hover { border-color: #6366f1; transform: translateY(-4px); }

.add-new {
  border: 2px dashed #232329;
  background: transparent;
  justify-content: center;
  align-items: center;
  color: #71717a;
}

.add-new .plus { font-size: 32px; margin-bottom: 8px; }

.card-body .title { font-size: 18px; margin: 0 0 10px 0; }
.card-body .preview { font-size: 14px; color: #71717a; line-height: 1.5; }

.card-footer {
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid #232329;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date { font-size: 12px; color: #52525b; }
.icon-btn { background: none; border: none; font-size: 16px; cursor: pointer; opacity: 0.6; transition: 0.2s; }
.icon-btn:hover { opacity: 1; transform: scale(1.1); }

.error-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 14px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-err { border-color: #ef4444 !important; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #16161a;
  width: 100%;
  max-width: 500px;
  padding: 40px;
  border-radius: 28px;
  border: 1px solid #232329;
}

.form { display: flex; flex-direction: column; gap: 16px; }
.form input, .form textarea {
  background: #0f0f12;
  border: 1px solid #232329;
  border-radius: 12px;
  padding: 16px;
  color: white;
  width: 100%;
  box-sizing: border-box;
}

.form textarea { height: 200px; resize: none; }
.modal-btns { margin-top: 30px; display: flex; gap: 12px; justify-content: flex-end; }

.btn-save { background: #6366f1; border: none; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: transparent; border: 1px solid #232329; color: #a1a1aa; padding: 12px 24px; border-radius: 12px; cursor: pointer; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 40px; }
.pagination button { background: #16161a; border: 1px solid #232329; color: white; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; }
.pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
</style>