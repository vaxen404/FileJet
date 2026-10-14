<template>
    <div ref="menuRef" class="item-menu">
        <button
            type="button"
            class="menu-trigger"
            aria-label="Actions"
            :aria-expanded="isOpen"
            @click="toggleMenu"
        >
            <Icon name="solar:menu-dots-bold" />
        </button>

        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="dropdownRef"
                class="menu-dropdown"
                :style="menuPosition"
            >
                <button
                    v-if="hasAction('open')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('open')"
                >
                    <Icon
                        class="menu-item-icon"
                        :name="type === 'folder'
                            ? 'solar:folder-open-bold'
                            : type === 'note'
                                ? 'solar:notebook-bold'
                                : 'solar:document-bold'"
                    />

                    Open
                </button>

                <button
                    v-if="hasAction('rename')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('rename')"
                >
                    <Icon class="menu-item-icon" name="solar:pen-bold" />
                    Rename
                </button>

                <button
                    v-if="type === 'file' && canCopy && hasAction('copy')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('copy')"
                >
                    <Icon class="menu-item-icon" name="solar:copy-bold" />
                    Copy
                </button>

                <button
                    v-if="hasAction('edit')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('edit')"
                >
                    <Icon class="menu-item-icon" name="solar:pen-bold" />
                    Edit
                </button>

                <button
                    v-if="hasAction('download')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('download')"
                >
                    <Icon class="menu-item-icon" name="solar:download-bold" />
                    Download
                </button>

                <button
                    v-if="hasAction('favorite')"
                    type="button"
                    class="menu-item"
                    @click="handleAction('favorite')"
                >
                    <Icon
                        class="menu-item-icon"
                        :name="isFavorite
                            ? 'solar:star-bold'
                            : 'solar:star-linear'"
                    />

                    {{ isFavorite ? 'Remove from Favorites' : 'Add to Favorites' }}
                </button>

                <button
                    v-if="hasAction('delete')"
                    type="button"
                    class="menu-item danger"
                    @click="handleAction('delete')"
                >
                    <Icon class="menu-item-icon" name="solar:trash-bin-trash-bold" />
                    Delete
                </button>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type Action =
    | 'open'
    | 'rename'
    | 'copy'
    | 'edit'
    | 'download'
    | 'favorite'
    | 'delete'

const props = withDefaults(
    defineProps<{
        type: 'file' | 'folder' | 'note'
        actions?: Action[]
        isFavorite?: boolean
        canCopy?: boolean
    }>(),
    {
        actions: () => [
            'open',
            'rename',
            'copy',
            'download',
            'favorite',
            'delete'
        ],
        isFavorite: false,
        canCopy: false
    }
)

const emit = defineEmits<{
    open: []
    rename: []
    copy: []
    edit: []
    download: []
    favorite: []
    delete: []
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const menuPosition = ref<Record<string, string>>({ visibility: 'hidden' })

const updatePosition = () => {
    if (!isOpen.value || !menuRef.value || !dropdownRef.value) return

    const trigger = menuRef.value.getBoundingClientRect()
    const dropdown = dropdownRef.value
    const viewport = window.visualViewport
    const viewportTop = viewport?.offsetTop ?? 0
    const viewportLeft = viewport?.offsetLeft ?? 0
    const viewportHeight = viewport?.height ?? window.innerHeight
    const viewportWidth = viewport?.width ?? window.innerWidth
    const viewportBottom = viewportTop + viewportHeight
    const viewportRight = viewportLeft + viewportWidth

    if (trigger.bottom <= viewportTop || trigger.top >= viewportBottom || trigger.right <= viewportLeft || trigger.left >= viewportRight) {
        isOpen.value = false
        return
    }

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const edge = rootFontSize * 0.5
    const style = getComputedStyle(dropdown)
    const verticalBorder = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const horizontalSpace = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
    const maxWidth = `${Math.max(0, viewportWidth - edge * 2 - horizontalSpace)}px`

    dropdown.style.maxWidth = maxWidth

    const width = dropdown.getBoundingClientRect().width
    const height = dropdown.scrollHeight + verticalBorder
    const below = Math.max(0, viewportBottom - edge - (trigger.bottom - edge))
    const above = Math.max(0, trigger.top + edge - viewportTop - edge)
    const opensUp = height > below && above > below
    const availableHeight = opensUp ? above : below
    const visibleHeight = Math.min(height, availableHeight)
    const top = opensUp ? trigger.top + edge - visibleHeight : trigger.bottom - edge
    const left = Math.min(
        Math.max(viewportLeft + edge, trigger.right - rootFontSize * 1.625 - width),
        viewportRight - edge - width
    )

    menuPosition.value = {
        top: `${Math.max(viewportTop + edge, top)}px`,
        left: `${left}px`,
        maxWidth,
        maxHeight: `${Math.max(0, availableHeight - verticalBorder - verticalPadding)}px`,
        visibility: 'visible'
    }
}

watch(isOpen, async (open, _, onCleanup) => {
    if (!open) return

    menuPosition.value = { visibility: 'hidden' }
    let cancelled = false
    let frame: number | null = null
    let observer: ResizeObserver | null = null
    let visibilityObserver: IntersectionObserver | null = null
    const viewport = window.visualViewport
    const schedulePosition = () => {
        if (frame !== null) return

        frame = window.requestAnimationFrame(() => {
            frame = null
            updatePosition()
        })
    }
    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') isOpen.value = false
    }

    window.addEventListener('scroll', schedulePosition, true)
    window.addEventListener('resize', schedulePosition)
    window.addEventListener('keydown', handleKeydown)
    viewport?.addEventListener('scroll', schedulePosition)
    viewport?.addEventListener('resize', schedulePosition)

    onCleanup(() => {
        cancelled = true
        if (frame !== null) window.cancelAnimationFrame(frame)
        observer?.disconnect()
        visibilityObserver?.disconnect()
        window.removeEventListener('scroll', schedulePosition, true)
        window.removeEventListener('resize', schedulePosition)
        window.removeEventListener('keydown', handleKeydown)
        viewport?.removeEventListener('scroll', schedulePosition)
        viewport?.removeEventListener('resize', schedulePosition)
    })

    await nextTick()
    if (cancelled || !isOpen.value) return

    updatePosition()

    if (typeof ResizeObserver !== 'undefined' && dropdownRef.value) {
        observer = new ResizeObserver(schedulePosition)
        observer.observe(dropdownRef.value)
        if (menuRef.value) observer.observe(menuRef.value)
    }

    if (typeof IntersectionObserver !== 'undefined' && menuRef.value) {
        visibilityObserver = new IntersectionObserver(([entry]) => {
            if (entry && !entry.isIntersecting) isOpen.value = false
        })
        visibilityObserver.observe(menuRef.value)
    }
})

const hasAction = (action: Action) => {
    return props.actions.includes(action)
}

const actionHandlers = {
    open: () => emit('open'),
    rename: () => emit('rename'),
    copy: () => emit('copy'),
    edit: () => emit('edit'),
    download: () => emit('download'),
    favorite: () => emit('favorite'),
    delete: () => emit('delete')
}

const toggleMenu = () => {
    isOpen.value = !isOpen.value
}

const handleAction = (action: Action) => {
    actionHandlers[action]()
    isOpen.value = false
}

onClickOutside(dropdownRef, () => {
    isOpen.value = false
}, { ignore: [menuRef] })
</script>

<style scoped>
.item-menu {
    position: relative;
    display: inline-flex;
}

.menu-trigger {
    width: 2rem;
    height: 2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    background: transparent;
    color: #a8a8b0;

    border: none;
    border-radius: 0.45rem;

    transform: rotate(90deg);

    font-size: 1.1rem;

    cursor: pointer;
}

.menu-trigger :deep(svg) {
    transform: rotate(90deg);
}

.menu-trigger:hover {
    background: #252529;
    color: #ffffff;
}

.menu-dropdown {
    position: fixed;

    width: max-content;
    min-width: min(11rem, calc(100vw - 2rem));

    padding: 0.35rem;

    display: flex;
    flex-direction: column;

    background: #1f1f23;

    border: 1px solid #303036;
    border-radius: 0.6rem;

    box-shadow: 0 0.6rem 2rem rgba(0, 0, 0, 0.35);

    overflow-y: auto;
    z-index: 1000;
}

.menu-item {
    width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 0.45rem;

    padding: 0.6rem;

    background: transparent;
    color: #d5d5da;

    border: none;
    border-radius: 0.45rem;

    font-size: 0.8rem;

    cursor: pointer;

    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
}

.menu-item :deep(.menu-item-icon) {
    width: 1rem;
    height: 1rem;
    flex: 0 0 1rem;
}

.menu-item:hover {
    background: #2a2a2f;
    color: #ffffff;
}

.menu-item.danger {
    color: #ff6b6b;
}

.menu-item.danger:hover {
    background: #3a2024;
}
</style>
