<script setup lang="ts">
import ConfirmModal from '../ui/ConfirmModal.vue'

const route = useRoute()
const isLogoutHover = ref(false)

const authUser = useAuthUser()

const { toastMessage, toastType, showToast, openToast } = useToast()

const showLogoutModal = ref(false)

const handleLogout = async () => {
    await $fetch('/api/auth/logout', {
        method: 'POST'
    })

    authUser.value = null

    showLogoutModal.value = false

    openToast('Logged out successfully', 'success')

    await navigateTo('/login')
}
</script>

<template>
    <aside class="sidebar-area">
        <div class="logo-area">
            <img src="/images/filejetlogo.png" alt="FileJet">
        </div>

        <div class="menu-section">
            <span class="menu-title">MAIN MENU</span>

            <NuxtLink
                to="/home"
                :class="{ active: route.path === '/home'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/home'
                        ? 'solar:home-2-bold'
                        : 'solar:home-2-linear'"
                />
                Home
            </NuxtLink>

            <NuxtLink
                to="/files"
                :class="{ active: route.path === '/files'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/files'
                        ? 'solar:document-bold'
                        : 'solar:document-linear'"
                />
                Files
            </NuxtLink>

            <NuxtLink
                to="/folders"
                :class="{ active: route.path === '/folders'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/folders'
                        ? 'solar:folder-bold'
                        : 'solar:folder-linear'"
                />
                Folders
            </NuxtLink>

            <NuxtLink
                to="/notes"
                :class="{ active: route.path === '/notes'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/notes'
                        ? 'solar:notebook-bold'
                        : 'solar:notebook-linear'"
                />
                Notes
            </NuxtLink>
        </div>

        <div class="menu-section">
            <span class="menu-title">OTHERS</span>

                <NuxtLink
                    :class="{ active: route.path === '/favorites'}"
                    to="/favorites"
                >
                    <Icon
                        class="menu-icon"
                        :name="route.path === '/favorites'
                            ? 'solar:star-bold'
                            : 'solar:star-outline'"
                    />
                    Favorites
                 </NuxtLink>

            <NuxtLink
                to="/shared"
                :class="{ active: route.path === '/shared'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/shared'
                        ? 'solar:share-circle-bold'
                        : 'solar:share-circle-linear'"
                />
                Shared
            </NuxtLink>

            <NuxtLink
                to="/trash"
                :class="{ active: route.path === '/trash'}"
            >
                <Icon
                    class="menu-icon"
                    :name="route.path === '/trash'
                        ? 'material-symbols:delete-rounded'
                        : 'material-symbols:delete-outline-rounded'"
                />
                Trash
            </NuxtLink>
        </div>

        <div class="menu-section">
            <span class="menu-title">SETTINGS</span>

                <NuxtLink
                    :class="{ active: route.path === '/settings/preferences'}"
                    to="/settings/preferences"
                >
                    <Icon
                        class="menu-icon"
                        :name="route.path === '/settings/preferences'
                            ? 'solar:settings-bold'
                            : 'solar:settings-linear'"
                    />
                    Preferences
                </NuxtLink>

                <NuxtLink
                    :class="{ active: route.path === '/settings/personalization'}"
                    to="/settings/personalization"
                >
                    <Icon
                        class="menu-icon"
                        :name="route.path === '/settings/personalization'
                            ? 'solar:palette-bold'
                            : 'solar:palette-linear'"
                    />
                    Personalization
                </NuxtLink>

            <button 
                class="logout-btn" 
                type="button"
                @click="showLogoutModal = true"
                @mouseenter="isLogoutHover = true"
                @mouseleave="isLogoutHover = false"
            >
                <Icon 
                    class="menu-icon" 
                    :name="isLogoutHover
                        ? 'solar:logout-2-bold'
                        : 'solar:logout-2-linear'" />
                Logout
            </button>
        </div>
    </aside>

    <ConfirmModal
        :show="showLogoutModal"
        title='Log out?'
        message="Are you sure you want to log out of your account?"
        confirm-text="Logout"
        cancel-text="Cancel"
        @confirm="handleLogout"
        @cancel="showLogoutModal = false"
    />
</template>

<style scoped>
.sidebar-area {
    width: 16rem;
    height: 100%;

    padding: 1.25rem;

    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 1rem;
    box-sizing: border-box;

    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.logo-area {
    width: 10rem;
    height: 3rem;
    overflow: hidden;
}

.logo-area img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.menu-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.menu-title {
    font-family: Arial, Helvetica, sans-serif;
    color: #c4bebe;
    font-size: 0.875rem;
    margin: 0.2rem 0.4rem;
}

.menu-icon {
    font-size: 1.3rem;
    flex-shrink: 0;
}

.menu-section a,
.menu-section button {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    width: 100%;
    padding: 0.75rem;

    color: #ffffff;
    background: transparent;
    border: none;
    border-radius: 0.65rem;
    box-sizing: border-box;

    text-decoration: none;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1rem;
    font-weight: 500;

    cursor: pointer;
}

.menu-section a:hover,
.menu-section button:hover {
    background: #252529;
}

.menu-section a.active {
    background: #5a5aff;
    color: white;
    font-weight: 700;
}

.menu-section .logout-btn:hover {
    background: #7f1d1d;
    color: #ffffff;
}
</style>