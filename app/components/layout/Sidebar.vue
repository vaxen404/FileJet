<template>
    <aside class="sidebar-area w-64 h-full min-h-0 overflow-hidden p-4 bg-surface border border-divider rounded-xl shrink-0 flex flex-col gap-5">
        <NuxtLink to="/home" aria-label="FileJet home" class="logo-area flex w-40 h-12 items-center gap-1 overflow-hidden no-underline">
            <BrandMark />
            <span class="text-xl font-bold tracking-tight text-foreground">FileJet</span>
        </NuxtLink>

        <nav aria-label="Main navigation" class="sidebar-navigation min-h-0 flex-1 overflow-y-auto overscroll-contain flex flex-col gap-5">
            <div class="menu-section flex flex-col gap-1">
                <span class="menu-title text-muted text-xs mt-0 mr-3 mb-1 ml-3 font-medium leading-normal">MAIN MENU</span>

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
                    to="/home"
                    :class="{ active: route.path === '/home' }"
                >
                    <Icon
                        class="menu-icon text-[1.3rem] shrink-0"
                        :name="route.path === '/home' ? 'solar:home-2-bold' : 'solar:home-2-linear'"
                    />
                    Home
                </NuxtLink>

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
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

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
                    to="/folders"
                    :class="{ active: route.path === '/folders' }"
                >
                    <Icon
                        class="menu-icon text-[1.3rem] shrink-0"
                        :name="route.path === '/folders' ? 'solar:folder-bold' : 'solar:folder-linear'"
                    />
                    Folders
                </NuxtLink>

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
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
                <span class="menu-title text-muted text-xs mt-0 mr-3 mb-1 ml-3 font-medium leading-normal">OTHERS</span>

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
                    :class="{ active: route.path === '/favorites' }"
                    to="/favorites"
                >
                    <Icon
                        class="menu-icon text-[1.3rem] shrink-0"
                        :name="route.path === '/favorites' ? 'solar:star-bold' : 'solar:star-outline'"
                    />
                    Favorites
                </NuxtLink>

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
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

                <NuxtLink class="flex items-center gap-2 w-full py-2 px-3 text-foreground bg-transparent border-0 rounded-md no-underline
                    text-sm font-medium cursor-pointer leading-normal min-h-9 hover:bg-control is-active:bg-primary
                    is-active:text-on-primary is-active:font-semibold is-active:hover:bg-primary is-active:hover:text-on-primary"
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

        </nav>

        <div class="sidebar-account shrink-0 border-t border-divider pt-3 max-laptop:hidden">
            <AccountMenu placement="sidebar" />
        </div>
    </aside>
</template>

<script setup lang="ts">
import AccountMenu from './AccountMenu.vue'
import BrandMark from '~/components/ui/BrandMark.vue'

const route = useRoute()
</script>
