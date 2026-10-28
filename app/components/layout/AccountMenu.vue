<template>
    <div class="account-menu" :class="`account-menu--${placement}`">
        <button
            ref="trigger"
            type="button"
            class="account-trigger"
            :class="{ 'is-open': isOpen }"
            :aria-label="`Account menu for ${username}`"
            :aria-expanded="isOpen"
            :aria-controls="menuId"
            aria-haspopup="menu"
            @click="toggleMenu"
            @keydown.down.prevent="openMenu()"
            @keydown.up.prevent="openMenu(true)"
        >
            <span class="account-avatar" aria-hidden="true">{{ initials }}</span>
            <span v-if="placement === 'sidebar'" class="account-trigger-text">
                <strong>{{ username }}</strong>
                <span>Personal account</span>
            </span>
            <Icon
                class="account-chevron"
                :name="placement === 'sidebar' ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'"
                size="16"
                aria-hidden="true"
            />
        </button>

        <Teleport to="body">
            <div
                :id="menuId"
                ref="popover"
                popover="auto"
                role="menu"
                aria-label="Account"
                class="account-popover"
                :style="menuPosition"
                @toggle="onToggle"
                @keydown="onMenuKeydown"
            >
                <div class="account-identity" role="presentation">
                    <span class="account-avatar account-avatar--large" aria-hidden="true">{{ initials }}</span>
                    <div class="account-identity-text">
                        <strong>{{ username }}</strong>
                        <span>{{ currentUser?.email || 'Personal account' }}</span>
                    </div>
                </div>

                <div class="account-storage" role="presentation">
                    <div><span>Storage</span><span>{{ usedStorage }} <span class="account-storage-limit">/ {{ totalStorage }}</span></span></div>
                    <meter :value="storagePercent" min="0" max="100" aria-label="Storage used">{{ storagePercent }}%</meter>
                </div>

                <div class="account-menu-items" role="presentation">
                    <NuxtLink to="/settings/preferences" role="menuitem" tabindex="-1" class="account-menu-item" @click="closeMenu()">
                        <Icon name="solar:user-circle-linear" size="19" aria-hidden="true" />
                        <span>Account &amp; preferences</span>
                        <Icon name="solar:alt-arrow-right-linear" class="account-item-arrow" size="14" aria-hidden="true" />
                    </NuxtLink>
                    <NuxtLink to="/settings/personalization" role="menuitem" tabindex="-1" class="account-menu-item" @click="closeMenu()">
                        <Icon name="solar:palette-linear" size="19" aria-hidden="true" />
                        <span>Appearance</span>
                        <Icon name="solar:alt-arrow-right-linear" class="account-item-arrow" size="14" aria-hidden="true" />
                    </NuxtLink>
                </div>

                <div class="account-theme-section" role="group" aria-label="Theme">
                    <div class="account-theme-heading"><span>Theme</span><span>{{ theme === 'system' ? 'Follows device' : resolvedTheme === 'light' ? 'Light mode' : 'Dark mode' }}</span></div>
                    <div class="account-theme-controls">
                        <button v-for="option in themeModes" :key="option.value" type="button" role="menuitemradio" tabindex="-1"
                            class="account-theme-button" :aria-checked="theme === option.value" :disabled="!preferencesLoaded"
                            @click="setTheme(option.value)">
                            <Icon :name="option.icon" size="15" aria-hidden="true" /><span>{{ option.label }}</span>
                        </button>
                    </div>
                </div>

                <div class="account-menu-footer" role="presentation">
                    <button type="button" role="menuitem" tabindex="-1" class="account-menu-item account-logout" :disabled="isSigningOut" @click="logout">
                        <Icon name="solar:logout-2-linear" size="19" aria-hidden="true" />
                        <span>{{ isSigningOut ? 'Logging out…' : 'Log out' }}</span>
                    </button>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { useEventListener, useMediaQuery } from '@vueuse/core'
import { formatFileSize } from '~/utils/file'
import { themeModes } from '~/utils/themes'

const props = withDefaults(defineProps<{ placement?: 'sidebar' | 'header' }>(), { placement: 'header' })
const currentUser = useAuthUser()
const { isSigningOut, requestLogout } = useAccountActions()
const { theme, resolvedTheme, setTheme } = useTheme()
const { preferencesLoaded } = usePreferences()
const route = useRoute()
const compact = useMediaQuery('(max-width: 1100px)')
const trigger = ref<HTMLButtonElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const menuId = `account-menu-${useId()}`
const menuPosition = ref<Record<string, string>>({})

const username = computed(() => currentUser.value?.username || 'My account')
const initials = computed(() => {
    const words = username.value.trim().split(/\s+/)
    return (words.length > 1 ? words[0]![0]! + words.at(-1)![0]! : username.value.slice(0, 2)).toUpperCase()
})
const usedStorage = computed(() => formatFileSize(currentUser.value?.storageUsed ?? '0'))
const totalStorage = computed(() => formatFileSize(currentUser.value?.storageLimit ?? '0'))
const storagePercent = computed(() => {
    const used = Number(currentUser.value?.storageUsed ?? 0)
    const limit = Number(currentUser.value?.storageLimit ?? 0)
    return Number.isFinite(used) && Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : 0
})

const positionMenu = () => {
    if (!trigger.value || !popover.value) return
    const anchor = trigger.value.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 24)
    popover.value.style.width = `${width}px`
    const height = popover.value.offsetHeight
    const left = props.placement === 'sidebar' ? anchor.left : anchor.right - width
    const top = props.placement === 'sidebar' ? anchor.top - height - 10 : anchor.bottom + 10

    menuPosition.value = {
        width: `${width}px`,
        left: `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`,
        top: `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`
    }
}

const menuItems = () => Array.from(popover.value?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])

const openMenu = async (last = false) => {
    if (!popover.value) return
    popover.value.showPopover()
    isOpen.value = true
    await nextTick()
    positionMenu()
    const items = menuItems()
    const target = last ? items.at(-1) : items[0]
    target?.focus()
}

const closeMenu = (restoreFocus = false) => {
    popover.value?.hidePopover()
    isOpen.value = false
    if (restoreFocus) trigger.value?.focus()
}

const toggleMenu = () => isOpen.value ? closeMenu(true) : openMenu()
const onToggle = (event: Event) => { isOpen.value = (event as ToggleEvent).newState === 'open' }

const onMenuKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu(true)
    } else if (event.key === 'Tab') {
        closeMenu(true)
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const items = menuItems()
        if (!items.length) return
        const index = items.indexOf(document.activeElement as HTMLElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
            : index === -1 ? (event.key === 'ArrowUp' ? items.length - 1 : 0)
              : (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length
        items[next]?.focus()
    }
}

const logout = async () => {
    closeMenu(true)
    await nextTick()
    await requestLogout()
}

watch(() => route.fullPath, () => closeMenu())
watch(compact, () => closeMenu())
useEventListener('resize', () => { if (isOpen.value) positionMenu() })
useEventListener('scroll', event => {
    if (event.target instanceof Node && popover.value?.contains(event.target)) return
    if (isOpen.value) closeMenu()
}, { capture: true, passive: true })
onBeforeUnmount(() => closeMenu())
</script>
