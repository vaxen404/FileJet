<script setup lang="ts">
defineProps<{
    title: string
    isFavorite: boolean
    busy: boolean
    itemType: 'file' | 'folder' | 'note'
}>()

const emit = defineEmits<{
    back: []
    select: [tab: 'details' | 'edit' | 'share']
    download: []
    favorite: []
    delete: []
}>()
const menuId = useId()
const menu = ref<HTMLElement | null>(null)
const run = (action: () => void) => {
    menu.value?.hidePopover()
    action()
}
</script>

<template>
    <header class="details-mobile-bar">
        <button type="button" class="details-bar-button" aria-label="Back" @click="emit('back')">
            <Icon name="solar:arrow-left-linear" size="22" />
        </button>
        <h1 :title="title">{{ title }}</h1>
        <button type="button" class="details-bar-button" :popovertarget="menuId" aria-label="Item actions">
            <Icon name="solar:menu-dots-bold" size="24" />
        </button>
        <div :id="menuId" ref="menu" popover class="details-mobile-menu" aria-label="Item actions">
            <div v-if="$slots.actions" class="details-extra-actions" @click="menu?.hidePopover()">
                <slot name="actions" />
            </div>
            <button type="button" :disabled="busy" @click="run(() => emit('select', 'details'))">
                <Icon name="solar:info-circle-linear" /> Details
            </button>
            <button type="button" :disabled="busy" @click="run(() => emit('select', 'edit'))">
                <Icon name="solar:pen-linear" /> {{ itemType === 'note' ? 'Edit note' : 'Rename' }}
            </button>
            <button type="button" :disabled="busy" @click="run(() => emit('select', 'share'))">
                <Icon name="solar:share-linear" /> Share
            </button>
            <button type="button" :disabled="busy" @click="run(() => emit('download'))">
                <Icon name="solar:download-linear" /> Download
            </button>
            <button type="button" :disabled="busy" @click="run(() => emit('favorite'))">
                <Icon :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'" />
                {{ isFavorite ? 'Remove from favorites' : 'Add to favorites' }}
            </button>
            <button type="button" class="details-menu-delete" :disabled="busy" @click="run(() => emit('delete'))">
                <Icon name="solar:trash-bin-trash-linear" /> Delete
            </button>
        </div>
    </header>
</template>
