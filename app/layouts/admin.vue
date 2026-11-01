<template>
    <div class="admin-shell flex h-dvh min-h-0 bg-canvas text-foreground">
        <aside class="hidden w-64 shrink-0 border-r border-divider bg-surface min-[1101px]:block" aria-label="Administration sidebar">
            <AdminNavigation />
        </aside>

        <dialog ref="navigationDialog" aria-label="Administration menu" class="admin-navigation-dialog" @click.self="closeNavigation" @close="mobileMenuOpen = false">
            <div class="relative h-full" @click="onNavigationClick">
                <button type="button" aria-label="Close administration menu" class="admin-header-button absolute right-3 top-3" @click="closeNavigation">
                    <Icon name="solar:close-circle-linear" size="20" aria-hidden="true" />
                </button>
                <AdminNavigation />
            </div>
        </dialog>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <header class="flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-divider bg-surface/60 px-8 max-mobile:min-h-17 max-mobile:px-4">
                <div class="flex min-w-0 items-center gap-3">
                    <button type="button" class="admin-header-button min-[1101px]:hidden" aria-label="Open administration menu" :aria-expanded="mobileMenuOpen" @click="openNavigation">
                        <Icon name="solar:hamburger-menu-linear" size="21" aria-hidden="true" />
                    </button>
                    <div class="min-w-0">
                        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Administration</p>
                        <p class="mt-0.5 truncate text-sm font-medium text-foreground">{{ pageTitle }}</p>
                    </div>
                </div>
                <div class="flex shrink-0 items-center gap-3">
                    <span class="rounded-md border border-accent/20 bg-accent/8 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-accent max-mobile:hidden">Admin console</span>
                    <button type="button" class="admin-header-button" :disabled="!preferencesLoaded" :aria-label="resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'" @click="toggleTheme">
                        <Icon :name="resolvedTheme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-linear'" size="20" aria-hidden="true" />
                    </button>
                </div>
            </header>
            <main id="admin-content" class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-8 max-mobile:p-4">
                <div class="mx-auto w-full max-w-360"><slot /></div>
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import AdminNavigation from '~/components/admin/AdminNavigation.vue'

const route = useRoute()
const pageTitle = computed(() => route.path.startsWith('/admin/users') ? 'Users' : 'Overview')
const { resolvedTheme, setTheme } = useTheme()
const { preferencesLoaded } = usePreferences()
const toggleTheme = () => setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
const navigationDialog = ref<HTMLDialogElement | null>(null)
const mobileMenuOpen = ref(false)
const isWide = useMediaQuery('(min-width: 1101px)')
const openNavigation = () => { navigationDialog.value?.showModal(); mobileMenuOpen.value = true }
const closeNavigation = () => { navigationDialog.value?.close(); mobileMenuOpen.value = false }
const onNavigationClick = (event: MouseEvent) => {
    if ((event.target as Element).closest('a, button:not([aria-label="Close administration menu"])')) closeNavigation()
}
watch(() => route.fullPath, closeNavigation)
watch(isWide, wide => { if (wide) closeNavigation() })
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";
@layer components {
    .admin-header-button { @apply grid size-10 shrink-0 place-items-center rounded-xl border border-control-border bg-surface text-muted cursor-pointer hover:bg-control hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent; }
}
.admin-navigation-dialog { position: fixed; inset: 0 auto 0 0; width: min(18rem, calc(100vw - 2rem)); height: 100dvh; max-height: 100dvh; max-width: none; margin: 0; padding: 0; border: 0; border-right: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-foreground); overflow-y: auto; }
.admin-navigation-dialog::backdrop { background: rgb(0 0 0 / 60%); }
</style>
