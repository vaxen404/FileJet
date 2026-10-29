<template>
    <div class="notification-center">
        <button ref="trigger" type="button" class="notification-trigger" :class="{ 'is-open': isOpen }"
            :aria-label="unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'"
            aria-haspopup="dialog" :aria-expanded="isOpen" :aria-controls="id" @click="toggle">
            <span class="notification-trigger-icon"><Icon :name="unreadCount ? 'solar:bell-bing-linear' : 'solar:bell-linear'" size="20" /></span>
            <span class="notification-trigger-label">Notifications</span>
            <span v-if="unreadCount" class="notification-count" aria-hidden="true">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>

        <Teleport to="body">
            <section :id="id" ref="panel" popover="auto" role="dialog" aria-modal="false" :aria-labelledby="`${id}-heading`"
                class="notification-panel" :style="position" @toggle="onToggle" @keydown.esc.prevent.stop="close(true)">
                <header class="notification-heading">
                    <div><h2 :id="`${id}-heading`">Notifications</h2><p>{{ unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'Your workspace activity' }}</p></div>
                    <button ref="closeButton" type="button" class="notification-icon-button" aria-label="Close notifications" @click="close(true)"><Icon name="solar:close-circle-linear" size="20" /></button>
                </header>

                <div class="notification-controls">
                    <div class="notification-tabs" role="group" aria-label="Notification filter">
                        <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">All <span>{{ entries.length }}</span></button>
                        <button type="button" :aria-pressed="filter === 'unread'" @click="filter = 'unread'">Unread <span>{{ unreadCount }}</span></button>
                    </div>
                    <button type="button" class="notification-text-button" :disabled="!unreadCount" @click="markAllRead"><Icon name="solar:check-read-linear" size="16" /><span>Mark all read</span></button>
                </div>

                <div class="notification-feed">
                    <ul v-if="visibleEntries.length" class="notification-list" aria-label="Workspace notifications">
                        <li v-for="entry in visibleEntries" :key="entry.id" class="notification-entry" :class="[{ 'is-unread': !entry.read }, `notification-entry--${entry.kind}`]">
                            <span class="notification-entry-icon" aria-hidden="true"><Icon :name="entryIcon(entry)" size="20" /></span>
                            <button type="button" class="notification-entry-content" @click="openEntry(entry)">
                                <span class="notification-entry-title">{{ entry.title }}<i v-if="!entry.read" aria-label="Unread" /></span>
                                <span class="notification-entry-message">{{ entry.message }}</span>
                                <span class="notification-entry-meta"><time :datetime="new Date(entry.createdAt).toISOString()" :title="new Date(entry.createdAt).toLocaleString()">{{ formatNotificationTime(entry.createdAt, now) }}</time><Icon v-if="entry.href" name="solar:arrow-right-up-linear" size="13" aria-hidden="true" /></span>
                            </button>
                            <div class="notification-entry-actions">
                                <button v-if="!entry.read" type="button" class="notification-icon-button" :aria-label="`Mark ${entry.title} as read`" @click="markRead(entry.id)"><Icon name="solar:check-read-linear" size="16" /></button>
                                <button type="button" class="notification-icon-button" :aria-label="`Dismiss ${entry.title}`" @click="dismiss(entry.id)"><Icon name="solar:close-circle-linear" size="16" /></button>
                            </div>
                        </li>
                    </ul>
                    <div v-else class="notification-empty" role="status">
                        <span><Icon name="solar:bell-off-linear" size="28" /></span>
                        <strong>{{ filter === 'unread' ? 'All caught up' : 'A little quieter here' }}</strong>
                        <p>{{ filter === 'unread' ? 'You have no unread notifications.' : 'Uploads, file changes, and important updates will appear here.' }}</p>
                    </div>
                </div>

                <footer class="notification-footer">
                    <span><Icon name="solar:history-linear" size="14" />{{ storageAvailable ? 'Saved in this browser' : 'Saved for this session only' }}</span>
                    <button type="button" class="notification-text-button" :disabled="!hasRead" @click="clearRead">Clear read</button>
                </footer>
            </section>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { useEventListener, useIntervalFn, useMediaQuery } from '@vueuse/core'
import type { ActivityNotification } from '~~/shared/types/notification'
import { formatNotificationTime } from '~/utils/notifications'

const { entries, unreadCount, storageAvailable, markRead, markAllRead, dismiss, clearRead } = useNotifications()
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)
const id = `notifications-${useId()}`
const position = ref<Record<string, string>>({})
const filter = ref<'all' | 'unread'>('all')
const now = ref(Date.now())
const route = useRoute()
const compact = useMediaQuery('(max-width: 1100px)')
const visibleEntries = computed(() => filter.value === 'unread' ? entries.value.filter(entry => !entry.read) : entries.value)
const hasRead = computed(() => entries.value.some(entry => entry.read))
const { pause, resume } = useIntervalFn(() => { now.value = Date.now() }, 60000, { immediate: false })

const updatePosition = () => {
    if (!trigger.value || !panel.value) return
    const rect = trigger.value.getBoundingClientRect()
    const width = Math.min(400, window.innerWidth - 24)
    panel.value.style.width = `${width}px`
    const height = panel.value.offsetHeight
    position.value = {
        width: `${width}px`,
        left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
        top: `${Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - height - 12))}px`
    }
}

const close = (restoreFocus = false) => {
    panel.value?.hidePopover()
    isOpen.value = false
    pause()
    if (restoreFocus) trigger.value?.focus()
}
const toggle = async () => {
    if (isOpen.value) { close(true); return }
    panel.value?.showPopover()
    isOpen.value = true
    now.value = Date.now()
    resume()
    await nextTick()
    updatePosition()
    closeButton.value?.focus({ preventScroll: true })
}
const onToggle = (event: Event) => {
    isOpen.value = (event as ToggleEvent).newState === 'open'
    if (!isOpen.value) pause()
}
const openEntry = async (entry: ActivityNotification) => {
    markRead(entry.id)
    if (entry.href) { close(true); await navigateTo(entry.href) }
}
const entryIcon = (entry: ActivityNotification) => {
    if (entry.kind === 'error') return 'solar:danger-triangle-linear'
    return { upload: 'solar:cloud-upload-linear', library: 'solar:folder-check-linear', sharing: 'solar:link-circle-linear', account: 'solar:user-circle-linear', storage: 'solar:server-square-linear', activity: 'solar:check-circle-linear' }[entry.category]
}

watch(() => route.fullPath, () => close())
watch(compact, () => close())
watch([visibleEntries, filter], async () => { if (isOpen.value) { await nextTick(); updatePosition() } })
useEventListener('resize', () => { if (isOpen.value) updatePosition() })
useEventListener('scroll', event => {
    if (event.target instanceof Node && panel.value?.contains(event.target)) return
    if (isOpen.value) close()
}, { capture: true, passive: true })
onBeforeUnmount(() => close())
</script>
