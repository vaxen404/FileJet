<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
defineProps<{
    type: 'file' | 'folder'
}>()

const emit = defineEmits<{
    open: [],
    rename: [],
    download: [],
    favorite: [],
    delete: []
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const actions = {
    open: () => emit('open'),
    rename: () => emit('rename'),
    download: () => emit('download'),
    favorite: () => emit('favorite'),
    delete: () => emit('delete')
}

const toggleMenu = () => {
    isOpen.value = !isOpen.value
}

const handleAction = (action: keyof typeof actions) => {
    actions[action]()
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
                type="button"
                class="menu-item"
                @click="handleAction('open')"
            >
                <Icon name="solar:folder-open-bold" />
                Open
            </button>

            <button
                type="button"
                class="menu-item"
                @click="handleAction('rename')"
            >
                <Icon name="solar:pen-bold" />
                Rename
            </button>

            <button
                v-if="type === 'file'"
                type="button"
                class="menu-item"
                @click="handleAction('download')"
            >
                <Icon name="solar:download-bold" />
                Download
            </button>

            <button
                type="button"
                class="menu-item"
                @click="handleAction('favorite')"
            >
                <Icon name="solar:star-bold" />
                Add to Favorites
            </button>

            <button
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

    font-size: 1.1rem;

    transform: rotate(90deg);

    cursor: pointer;
}

.menu-trigger:hover {
    background: #252529;
    color: #ffffff;
}

.menu-dropdown {
    position: absolute;

    top: calc(100% + 0.4rem);
    right: 0;

    width: 10rem;

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
    gap: 0.6rem;

    padding: 0.65rem 0.7rem;

    background: transparent;

    color: #d5d5da;

    border: none;
    border-radius: 0.45rem;

    font-size: 0.85rem;

    cursor: pointer;

    text-align: left;
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