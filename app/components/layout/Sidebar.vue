<template>
    <aside class="sidebar-area w-64 h-full p-4 bg-surface border border-divider rounded-xl shrink-0 flex flex-col gap-5">
        <div class="logo-area w-40 h-12 overflow-hidden">
            <img class="object-cover size-full"
                src="/images/filejetlogo.png"
                alt="FileJet"
            />
        </div>

        <div class="menu-section flex flex-col gap-1">
            <span class="menu-title text-[#c4bebe] text-xs mt-0 mr-3 mb-1 ml-3 font-medium leading-normal">MAIN MENU</span>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/home"
                :class="{ active: route.path === '/home' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="route.path === '/home' ? 'solar:home-2-bold' : 'solar:home-2-linear'"
                />
                Home
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/files"
                :class="{ active: route.path === '/files' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/files' ? 'solar:document-bold' : 'solar:document-linear'
                    "
                />
                Files
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/folders"
                :class="{ active: route.path === '/folders' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="route.path === '/folders' ? 'solar:folder-bold' : 'solar:folder-linear'"
                />
                Folders
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/notes"
                :class="{ active: route.path === '/notes' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/notes' ? 'solar:notebook-bold' : 'solar:notebook-linear'
                    "
                />
                Notes
            </NuxtLink>
        </div>

        <div class="menu-section flex flex-col gap-1">
            <span class="menu-title text-[#c4bebe] text-xs mt-0 mr-3 mb-1 ml-3 font-medium leading-normal">OTHERS</span>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                :class="{ active: route.path === '/favorites' }"
                to="/favorites"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="route.path === '/favorites' ? 'solar:star-bold' : 'solar:star-outline'"
                />
                Favorites
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/shared"
                :class="{ active: route.path === '/shared' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/shared'
                            ? 'solar:share-circle-bold'
                            : 'solar:share-circle-linear'
                    "
                />
                Shared
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                to="/trash"
                :class="{ active: route.path === '/trash' }"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/trash'
                            ? 'material-symbols:delete-rounded'
                            : 'material-symbols:delete-outline-rounded'
                    "
                />
                Trash
            </NuxtLink>
        </div>

        <div class="menu-section flex flex-col gap-1">
            <span class="menu-title text-[#c4bebe] text-xs mt-0 mr-3 mb-1 ml-3 font-medium leading-normal">SETTINGS</span>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                :class="{ active: route.path === '/settings/preferences' }"
                to="/settings/preferences"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/settings/preferences'
                            ? 'solar:settings-bold'
                            : 'solar:settings-linear'
                    "
                />
                Preferences
            </NuxtLink>

            <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md no-underline
                text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#252529] is-active:bg-primary
                is-active:text-white is-active:font-semibold"
                :class="{ active: route.path === '/settings/personalization' }"
                to="/settings/personalization"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="
                        route.path === '/settings/personalization'
                            ? 'solar:palette-bold'
                            : 'solar:palette-linear'
                    "
                />
                Personalization
            </NuxtLink>

            <button
                class="logout-btn flex items-center gap-2 w-full py-2 px-3 text-white bg-transparent border-0 rounded-md
                no-underline text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-[#7f1d1d]
                hover:text-white"
                type="button"
                @click="showLogoutModal = true"
                @mouseenter="isLogoutHover = true"
                @mouseleave="isLogoutHover = false"
            >
                <Icon
                    class="menu-icon text-[1.3rem] shrink-0"
                    :name="isLogoutHover ? 'solar:logout-2-bold' : 'solar:logout-2-linear'"
                />
                Logout
            </button>
        </div>
    </aside>

    <ConfirmModal
        :show="showLogoutModal"
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirm-text="Logout"
        cancel-text="Cancel"
        @confirm="handleLogout"
        @cancel="showLogoutModal = false"
    />
</template>

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
