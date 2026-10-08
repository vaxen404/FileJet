<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

type Action =
    | 'open'
    | 'rename'
    | 'edit'
    | 'download'
    | 'favorite'
    | 'delete'

const props = withDefaults(
    defineProps<{
        type: 'file' | 'folder' | 'note'
        actions?: Action[]
        isFavorite?: boolean
    }>(),
    {
        actions: () => [
            'open',
            'rename',
            'download',
            'favorite',
            'delete'
        ],
        isFavorite: false
    }
)

const emit = defineEmits<{
    open: []
    rename: []
    edit: []
    download: []
    favorite: []
    delete: []
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const hasAction = (action: Action) => {
    return props.actions.includes(action)
}

const actionHandlers = {
    open: () => emit('open'),
    rename: () => emit('rename'),
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

onClickOutside(menuRef, () => {
    isOpen.value = false
})
</script>

<template>
    <div ref="menuRef" class="item-menu">
        <button
            type="button"
            class="menu-trigger"
            @click="toggleMenu"
        >
            <Icon name="solar:menu-dots-bold" />
        </button>

        <div
            v-if="isOpen"
            class="menu-dropdown"
        >
            <button
                v-if="hasAction('open')"
                type="button"
                class="menu-item"
                @click="handleAction('open')"
            >
                <Icon
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
                <Icon name="solar:pen-bold" />
                Rename
            </button>

            <button
                v-if="hasAction('edit')"
                type="button"
                class="menu-item"
                @click="handleAction('edit')"
            >
                <Icon name="solar:pen-bold" />
                Edit
            </button>

            <button
                v-if="hasAction('download')"
                type="button"
                class="menu-item"
                @click="handleAction('download')"
            >
                <Icon name="solar:download-bold" />
                Download
            </button>

            <button
                v-if="hasAction('favorite')"
                type="button"
                class="menu-item"
                @click="handleAction('favorite')"
            >
                <Icon
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
                <Icon name="solar:trash-bin-trash-bold" />
                Delete
            </button>
        </div>
    </div>
</template>

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
    position: absolute;

    top: calc(100% - 0.5rem);
    right: 1.625rem;

    width: 11rem;

    padding: 0.35rem;

    display: flex;
    flex-direction: column;

    background: #1f1f23;

    border: 1px solid #303036;
    border-radius: 0.6rem;

    box-shadow: 0 0.6rem 2rem rgba(0, 0, 0, 0.35);

    z-index: 50;
}

.menu-item {
    width: 100%;

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
    white-space: nowrap;
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