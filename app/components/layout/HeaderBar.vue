<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'Dashboard'
  }
})

const avatar = ref('VX')
</script>

<template>
  <header class="header-bar">
    <div class="title">
      <h1>{{ title }}</h1>
    </div>

    <div class="header-actions">
      <button class="icon-button" type="button">
        <Icon name="solar:bell-linear" />
        <span class="notification-dot"></span>
      </button>

      <button class="profile-button" type="button">
        <div class="avatar">
          {{ avatar }}
        </div>

        <Icon
          class="arrow-icon"
          name="solar:alt-arrow-down-linear"
        />
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-bar {
  width: 100%;
  height: 5rem;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 1.25rem;

  background: #1a1a1d;
  border: 1px solid #29292e;
  border-radius: 1rem;

  box-sizing: border-box;
}

.title h1 {
  margin: 0;

  color: #ffffff;

  font-size: 1.7rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-button {
  position: relative;

  width: 2.8rem;
  height: 2.8rem;

  display: flex;
  align-items: center;
  justify-content: center;

  color: #ffffff;
  background: #202024;

  border: 1px solid #303036;
  border-radius: 0.7rem;

  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.icon-button:hover {
  background: #2a2a2f;
  border-color: #3d3d44;
}

.icon-button svg {
  font-size: 1.3rem;
}

.notification-dot {
  position: absolute;

  top: 0.55rem;
  right: 0.55rem;

  width: 0.4rem;
  height: 0.4rem;

  background: #5a5aff;
  border-radius: 50%;
}

.profile-button {
  height: 2.8rem;

  display: flex;
  align-items: center;
  gap: 0.6rem;

  padding: 0 0.65rem;

  color: #ffffff;
  background: #202024;

  border: 1px solid #303036;
  border-radius: 0.7rem;

  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.profile-button:hover {
  background: #2a2a2f;
  border-color: #3d3d44;
}

.avatar {
  width: 2rem;
  height: 2rem;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #5a5aff;
  border-radius: 50%;

  font-size: 0.8rem;
  font-weight: 700;
}

.arrow-icon {
  color: #b5b5bd;
  font-size: 1rem;
}
</style>