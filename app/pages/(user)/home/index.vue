<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'user'
})

const files = ref([
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB'
  },
  {
    name: 'image.png',
    iconName: 'lucide:image',
    type: 'Images',
    time: '2 minutes ago',
    size: '1.2 MB'
  },
  {
    name: 'document.pdf',
    iconName: 'lucide:file-text',
    type: 'Documents',
    time: '12 minutes ago',
    size: '842 KB'
  },
  {
    name: 'archive.zip',
    iconName: 'lucide:archive',
    type: 'Compressed',
    time: '5 hours ago',
    size: '4.8 MB'
  }
])

const folder = ref([])
const notes = ref([])

const storageUsed = ref(0)
const storageLimit = ref(0)
const storageTop = ref(40)
const imagesSize = ref(0)
const documentsSize = ref(0)
const videosSize = ref(0)
const othersSize = ref(0)
</script>

<template>
  <div class="dashboard-page">
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple-bg">
          <Icon name="solar:document-linear" class="purple" />
        </div>

        <div class="stat-info">
          <strong>{{ files.length }}</strong>
          <span>Files</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue-bg">
          <Icon name="solar:folder-linear" class="blue" />
        </div>

        <div class="stat-info">
          <strong>{{ folder.length }}</strong>
          <span>Folders</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green-bg">
          <Icon name="solar:notebook-linear" class="green" />
        </div>

        <div class="stat-info">
          <strong>{{ notes.length }}</strong>
          <span>Notes</span>
        </div>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="dashboard-left">
        <div class="dashboard-card">
          <div class="card-header">
            <h2>Recent Files</h2>

            <NuxtLink to="/files">
              View all
              <Icon name="solar:arrow-right-linear" />
            </NuxtLink>
          </div>

          <div class="files-list">
            <div 
              v-for="(file, index) in files"
              :key="index"
              class="file-main"
            >
              <div class="file-left">
                <div class="file-icon">
                  <Icon :name="file.iconName" />
                </div>
  
                <div class="file-info">
                  <strong>{{ file.name }}</strong>
                  <span>{{ file.type }} • {{ file.time }}</span>
                </div>
              </div>

              <div class="file-right">
                <span class="file-size">{{ file.size }}</span>

                <button class="file-menu" type="button">
                  <Icon name="solar:menu-dots-bold" class="vertical-dots" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-right">
        <div class="dashboard-card storage-card">
          <div class="card-header">
            <h2>Storage Usage</h2>
          </div>

          <div class="storage-content">
            <div class="storage-top">
              <strong>{{ storageTop }}%</strong>

              <span>
                <b>{{ storageUsed }} GB</b> / {{ storageLimit }} GB
              </span>
            </div>
          

            <meter 
              class="storage-meter"
              min="0"
              max="100"
              :value="storageTop"
            >
              {{ storageTop }}%
            </meter>

            <div class="storage-types">
              <div class="storage-item">
                <div class="storage-name">
                  <span class="storage-dot blue-dot"></span>
                  Images
                </div>

                <span>{{ imagesSize }} GB</span>
              </div>

              <div class="storage-item">
                <div class="storage-name">
                  <span class="storage-dot purple-dot"></span>
                  Documents
                </div>

                <span>{{ documentsSize }} GB</span>
              </div>
              
              <div class="storage-item">
                <div class="storage-name">
                  <span class="storage-dot cyan-dot"></span>
                  Videos
                </div>
                
                <span>{{ videosSize }} GB</span>
              </div>
              
              <div class="storage-item">
                <div class="storage-name">
                  <span class="storage-dot gray-dot"></span>
                  Others
                </div>
                
                <span>{{ othersSize }} GB</span>
              </div>
            </div>
          </div>

        </div>
        <div class="dashboard-card quick-card">
          <div class="card-header">
            <h2>Quick Actions</h2>
          </div>  

          <div class="quick-actions-grid">
            <button @click="navigateTo('/files')" type="button" class="quick-action-card">
              <div class="quick-action-icon upload-icon">
                <Icon name="solar:upload-linear" />
              </div>

              <span class="quick-action-title">Upload File</span>
            </button>

            <button @click="navigateTo('/folders')" type="button" class="quick-action-card">
              <div class="quick-action-icon folder-icon">
                <Icon name="solar:add-linear" />
              </div>

              <span class="quick-action-title">New Folder</span>
            </button>

            <button type="button" class="quick-action-card">
              <div class="quick-action-icon note-icon">
                <Icon name="solar:notebook-linear" />
              </div>

              <span class="quick-action-title">New Note</span>
            </button>

            <button type="button" class="quick-action-card">
              <div class="quick-action-icon inbox-icon">
                <Icon name="solar:users-group-rounded-linear" class="" />
              </div>

              <span class="quick-action-title">Shared Inbox</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .dashboard-page {
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    gap: 1rem;

    box-sizing: border-box;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;

    flex-shrink: 0;
  }

  .stat-card {
    min-height: 8rem;

    display: flex;
    align-items: center;
    gap: 1.3rem;

    padding: 1.4rem;

    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;

    box-sizing: border-box;
  }

  .stat-icon {
    width: 3.4rem;
    height: 3.4rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #7777ff;
    background: #24244d;

    border-radius: 0.8rem;

    font-size: 1.6rem;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .stat-info strong {
    color: #ffffff;

    font-size: 1.7rem;
    font-weight: 700;
  }

  .stat-info span {
    color: #92929a;
    font-size: 0.9rem;
  }

  .purple {
    color: #8b7cff;
  }

  .blue {
    color: #5da9ff;
  }

  .green {
    color: #55db8c;
  }

  .purple-bg {
    background: #29215c;
  }

  .blue-bg {
    background: #152c49;
  }

  .green-bg {
    background: #153a29;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.15fr);
    gap: 1rem;

    flex: 1;
    min-height: 0;
  }

  .dashboard-left,
  .dashboard-right {
    display: flex;
    flex-direction: column;
  
    min-width: 0;
  }

  .dashboard-left {
    height: 100%;
    min-height: 0;
  }

  .dashboard-left .dashboard-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .dashboard-card {
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;

    box-sizing: border-box;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 1.2rem 1.4rem;

    flex-shrink: 0;
  }

  .card-header h2 {
    margin: 0;

    color: #ffffff;

    font-size: 1.1rem;
    font-weight: 700;
  }

  .card-header a {
    display: flex;
    align-items: center;
    gap: 0.3rem;

    color: #7777ff;

    text-decoration: none;
    font-size: 0.85rem;
  }

  .card-header a:hover {
    color: #9999ff;
  }

  .files-list {
    flex: 1;
    min-height: 0;

    padding: 0 1.4rem 0.5rem;

    overflow-y: auto;
    overflow-x: hidden;

    scrollbar-width: thin;
    scrollbar-color: #39393f transparent;
  }

  .files-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .files-list::-webkit-scrollbar-thumb {
    background: #39393f;
    border-radius: 999px;
  }

  .files-list::-webkit-scrollbar-thumb:hover {
    background: #4a4a52;
  }

  .file-main {
    width: 100%;
    min-height: 4.6rem;

    display: flex;
    align-items: center;
    justify-content: space-between;
    
    border-top: 1px solid #29292e;
  }

  .file-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  
  .file-icon {
    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #8b7cff;
    background: #29215c;

    border-radius: 0.6rem;

    font-size: 1.25rem;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-info strong {
    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 500;
  }

  .file-info span {
    color: #898991;

    font-size: 0.78rem;
  }

  .file-right {
    display: flex;
    align-items: center;
    gap: 0.675rem;
  }

  .file-size {
    min-width: 4.5rem;
    color: #b0b0b8;
    font-size: 0.85rem;
    text-align: right;
  }

  .file-menu {
    width: 2rem;
    height: 2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #9a9aa3;
    background: transparent;

    border: none;
    border-radius: 0.45rem;

    font-size: 1.25rem;
    cursor: pointer;
  }

  .file-menu:hover {
    color: #ffffff;
    background: #29292e;
  }

  .vertical-dots {
    transform: rotate(90deg);
  }

  .dashboard-right {
    height: 100%;
    min-height: 0;

    display: flex;
    flex-direction: column;
    gap: 1rem;

    min-height: 0;
  }

  .storage-content {
    width: 100%;
    padding: 0 1.4rem 1.4rem;
    box-sizing: border-box;
  }

  .storage-top {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 0.8rem 0 0.2rem;

    margin-bottom: 0.4rem;
  }

  .storage-top strong {
    color: #ffffff;
    font-size: 1.275rem;
  }
  
  .storage-top span {
    color: #8d8d95;
    font-size: 0.85rem;
  }

  .storage-top b {
    color: #ffffff;
    font-weight: 600;
  }

  .storage-meter {
    width: 100%;
    max-width: 100%;
    height: 1rem;

    display: block;
    box-sizing: border-box;

    appearance: none;
    -webkit-appearance: none;

    border: none;
    border-radius: 999px;
    background: #2c2c31;
  }

  .storage-meter::-webkit-meter-bar {
    background: #29292e;
    border: none;
    border-radius: 999px;

    box-shadow: none;
  }

  .storage-meter::-webkit-meter-optimum-value {
    background: #4242fc;
    border-radius: 999px;
  }

  .storage-meter::-moz-meter-bar {
    background: #4242fc;
    border-radius: 999px;
  }

  .storage-types {
    display: flex;
    flex-direction: column; 
    gap: 1.1rem;

    margin-top: 3rem;
  }

  .storage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;

    color: #92929a;
    font-size: 0.85rem;
  }

  .storage-name {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .storage-dot {
    width: 0.55rem;
    height: 0.55rem;

    border-radius: 50%;
    flex-shrink: 0;
  }

  .blue-dot {
    background: #5da9ff;
  }

  .purple-dot {
    background: #8b7cff;
  }

  .cyan-dot {
    background: #55c2d4;
  }

  .gray-dot {
    background: #6b6b75;
  }

  .storage-card,
  .quick-card {
    flex: 1;
    min-height: 0;
  }

  .quick-card {
    padding-bottom: 1.4rem;
  }

  .quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;

    padding: 0 1.4rem;
  }

  .quick-action-card {
    min-height: 7rem;

    display: flex;
    align-items: center;
    gap: 1rem;

    padding: 1rem 1.2rem;

    color: #ffffff;
    background: #1d1d21;

    border: 1px solid #2d2d33;
    border-radius: 1rem;

    cursor: pointer;

    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .quick-action-card:hover {
    background: #232328;
    border-color: #383840;

    transform: translateY(-1px);
  }

  .quick-action-icon {
    width: 3.4rem;
    height: 3.4rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 0.9rem;

    font-size: 1.65rem;
  }

  .quick-action-title {
    color: #ffffff;

    font-size: 0.95rem;
    font-weight: 600;

    text-align: left;
  }

  .upload-icon {
    color: #ffffff;
    background: #356de8;
  }

  .folder-icon {
    color: #5da9ff;
    background: #173655;

    border: 1px solid #234c70;
  }

  .note-icon {
    color: #55db8c;
    background: #16452d;

    border: 1px solid #1d5d3a;
  }

  .inbox-icon {
    color: #ffffff;
    background: #5c2ca7;

    border: 1px solid #7138c2;
  }
</style>