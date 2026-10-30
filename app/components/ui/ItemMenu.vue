<template>
    <div
        ref="menuRef"
        class="item-menu relative inline-flex"
    >
        <button
            v-if="!contextOnly"
            type="button"
            :disabled="disabled"
            aria-label="Item actions"
            :aria-expanded="isOpen"
            class="menu-trigger flex items-center justify-center bg-surface text-label border-0 rounded-control
            text-control-icon cursor-pointer hover:bg-control hover:text-foreground size-8"
            @click="toggleMenu"
        >
            <Icon class="shrink-0 rotate-90 size-control-icon" name="solar:menu-dots-bold" />
        </button>

        <Teleport to="body">
            <Transition name="dropdown">
                <div
                    v-if="isOpen"
                    ref="dropdownRef"
                    class="menu-dropdown fixed w-max min-w-[min(11rem,_calc(100vw_-_2rem))] p-[3px] flex flex-col
                    bg-surface-hover border border-control-border rounded-menu shadow-[0_0.6rem_2rem_rgba(0,_0,_0,_0.35)]
                    overflow-y-auto z-1000"
                    :style="menuPosition"
                    @click.stop
                    @contextmenu.stop
                >
                    <component
                        :is="action.href && !action.disabled ? 'a' : 'button'"
                        v-for="action in customActions"
                        :key="action.id"
                        :type="action.href && !action.disabled ? undefined : 'button'"
                        :href="action.disabled ? undefined : action.href"
                        :target="action.href ? '_blank' : undefined"
                        :rel="action.href ? 'noopener noreferrer' : undefined"
                        :disabled="disabled || action.disabled"
                        class="menu-item no-underline disabled:cursor-not-allowed disabled:opacity-40"
                        :class="action.danger ? 'text-danger hover:bg-danger-surface' : 'text-content hover:bg-raised hover:text-foreground'"
                        @click="handleCustomAction(action)"
                    >
                        <Icon class="text-lg flex-none size-4.5" :name="action.icon" />
                        {{ action.label }}
                    </component>
                    <button
                        v-if="hasAction('open')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('open')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            :name="
                                type === 'folder'
                                    ? 'solar:folder-open-bold'
                                    : type === 'note'
                                      ? 'solar:notebook-bold'
                                      : 'solar:document-bold'
                            "
                        />

                        Open
                    </button>

                    <button
                        v-if="hasAction('rename')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('rename')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            name="solar:pen-bold"
                        />
                        Rename
                    </button>

                    <button
                        v-if="type === 'file' && canCopy && hasAction('copy')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('copy')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            name="solar:copy-bold"
                        />
                        Copy
                    </button>

                    <button
                        v-if="hasAction('edit')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('edit')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            name="solar:pen-bold"
                        />
                        Edit
                    </button>

                    <button
                        v-if="hasAction('download')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('download')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            name="solar:download-bold"
                        />
                        Download
                    </button>

                    <button
                        v-if="hasAction('favorite')"
                        type="button"
                        class="menu-item w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-content border-0
                        rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-raised hover:text-foreground"
                        @click="handleAction('favorite')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'"
                        />

                        {{ isFavorite ? 'Remove from Favorites' : 'Add to Favorites' }}
                    </button>

                    <button
                        v-if="hasAction('delete')"
                        type="button"
                        class="menu-item danger w-full shrink-0 flex items-center gap-2 py-2 px-3 bg-transparent text-danger
                        border-0 rounded-control text-control-size cursor-pointer text-left whitespace-normal wrap-anywhere
                        font-medium leading-normal hover:bg-danger-surface hover:text-danger"
                        @click="handleAction('delete')"
                    >
                        <Icon
                            class="menu-item-icon text-control-icon [flex:0_0_var(--ui-control-icon-size,_1.125rem)] size-control-icon"
                            name="solar:trash-bin-trash-bold"
                        />
                        Delete
                    </button>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type Action = 'open' | 'rename' | 'copy' | 'edit' | 'download' | 'favorite' | 'delete'
type CustomAction = { id: string; label: string; icon: string; href?: string; disabled?: boolean; danger?: boolean }

const props = withDefaults(
    defineProps<{
        type: 'file' | 'folder' | 'note'
        actions?: Action[]
        isFavorite?: boolean
        canCopy?: boolean
        contextOnly?: boolean
        disabled?: boolean
        customActions?: CustomAction[]
    }>(),
    {
        actions: () => ['open', 'rename', 'copy', 'download', 'favorite', 'delete'],
        isFavorite: false,
        canCopy: false,
        contextOnly: false,
        disabled: false,
        customActions: () => []
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
    customAction: [id: string]
}>()

const menuId = useId()

const activeMenuId = useState<string | null>('item-menu:active', () => null)

const isOpen = computed({
    get: () => activeMenuId.value === menuId,
    set: (open: boolean) => {
        if (open) activeMenuId.value = menuId
        else if (activeMenuId.value === menuId) activeMenuId.value = null
    }
})

const contextPosition = ref<{ x: number; y: number } | null>(null)
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

    if (
        !contextPosition.value &&
        (trigger.bottom <= viewportTop ||
            trigger.top >= viewportBottom ||
            trigger.right <= viewportLeft ||
            trigger.left >= viewportRight)
    ) {
        isOpen.value = false

        return
    }

    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const edge = rootFontSize * 0.5
    const style = getComputedStyle(dropdown)
    const verticalBorder = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

    const horizontalSpace =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth)

    const maxWidth = `${Math.max(0, viewportWidth - edge * 2 - horizontalSpace)}px`
    const minWidth = `${Math.min(rootFontSize * 11, parseFloat(maxWidth))}px`

    dropdown.style.maxWidth = maxWidth
    dropdown.style.minWidth = minWidth

    const width = dropdown.getBoundingClientRect().width
    const height = dropdown.scrollHeight + verticalBorder

    const anchorBottom = contextPosition.value
        ? Math.min(Math.max(contextPosition.value.y, viewportTop + edge), viewportBottom - edge)
        : trigger.bottom - edge

    const anchorTop = contextPosition.value ? anchorBottom : trigger.top + edge
    const below = Math.max(0, viewportBottom - edge - anchorBottom)
    const above = Math.max(0, anchorTop - viewportTop - edge)
    const opensUp = height > below && above > below
    const availableHeight = opensUp ? above : below
    const visibleHeight = Math.min(height, availableHeight)
    const top = opensUp ? anchorTop - visibleHeight : anchorBottom

    const left = Math.min(
        Math.max(
            viewportLeft + edge,
            contextPosition.value?.x ?? trigger.right - rootFontSize * 1.625 - width
        ),
        viewportRight - edge - width
    )

    menuPosition.value = {
        top: `${Math.max(viewportTop + edge, top)}px`,
        left: `${left}px`,
        maxWidth,
        minWidth,
        maxHeight: `${Math.max(0, availableHeight - verticalBorder - verticalPadding)}px`,
        visibility: 'visible'
    }
}

watch([isOpen, contextPosition], async ([open], _, onCleanup) => {
    if (!open) return

    menuPosition.value = { visibility: 'hidden' }
    let cancelled = false
    let frame: number | null = null
    let observer: ResizeObserver | null = null
    let visibilityObserver: IntersectionObserver | null = null
    const viewport = window.visualViewport

    const handleScroll = (event: Event) => {
        // Keep scrolling inside a tall menu available; close a pointer-anchored
        // menu when its file moves instead of leaving it over another file.
        if (
            contextPosition.value &&
            !(event.target instanceof Node && dropdownRef.value?.contains(event.target))
        ) {
            isOpen.value = false

            return
        }

        schedulePosition()
    }

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

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', schedulePosition)
    window.addEventListener('keydown', handleKeydown)
    viewport?.addEventListener('scroll', schedulePosition)
    viewport?.addEventListener('resize', schedulePosition)

    onCleanup(() => {
        cancelled = true

        if (frame !== null) window.cancelAnimationFrame(frame)

        observer?.disconnect()
        visibilityObserver?.disconnect()
        window.removeEventListener('scroll', handleScroll, true)
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

    if (!contextPosition.value && typeof IntersectionObserver !== 'undefined' && menuRef.value) {
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
    if (props.disabled) return
    contextPosition.value = null
    isOpen.value = !isOpen.value
}

const openAt = (x: number, y: number) => {
    if (props.disabled) return
    contextPosition.value = { x, y }
    isOpen.value = true
}

defineExpose({ openAt })

watch(() => props.disabled, disabled => { if (disabled) isOpen.value = false })

const handleCustomAction = (action: CustomAction) => {
    if (props.disabled || action.disabled) return
    emit('customAction', action.id)
    isOpen.value = false
}

onBeforeUnmount(() => {
    isOpen.value = false
})

const handleAction = (action: Action) => {
    if (props.disabled) return
    actionHandlers[action]()
    isOpen.value = false
}

onClickOutside(
    dropdownRef,
    () => {
        isOpen.value = false
    },
    { ignore: [menuRef] }
)
</script>
