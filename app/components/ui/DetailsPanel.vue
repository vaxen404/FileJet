<template>
    <div class="details-panel w-full min-w-0 flex flex-col gap-3">
        <div class="details-actions w-full grid grid-cols-2 gap-2 p-2 bg-surface border border-divider rounded-3xl">
            <button
                v-if="actions.includes('download')"
                class="actions-btn download bg-primary text-on-primary border-primary hover:bg-primary/85
                    hover:text-on-primary hover:border-primary"
                @click="emit('download')"
            >
                <Icon name="solar:download-bold" />
                Download
            </button>

            <button
                v-if="actions.includes('rename')"
                class="actions-btn bg-control text-content border-control-border hover:bg-divider hover:text-foreground
                    hover:border-hover-border"
                @click="emit('rename')"
            >
                <Icon name="solar:pen-bold" />
                Rename
            </button>

            <button
                v-if="actions.includes('favorite')"
                class="actions-btn bg-control text-content border-control-border hover:bg-divider hover:text-foreground
                    hover:border-hover-border"
                @click="emit('favorite')"
            >
                <Icon :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'" />

                {{ isFavorite ? 'Remove Favorite' : 'Favorite' }}
            </button>

            <button
                v-if="itemType === 'file' && canCopy && actions.includes('copy')"
                type="button"
                class="actions-btn copy bg-control text-content border-control-border hover:bg-divider
                    hover:text-foreground hover:border-hover-border"
                :disabled="isCopying"
                @click="emit('copy')"
            >
                <Icon name="solar:copy-bold" />
                {{ isCopying ? 'Copying...' : 'Copy' }}
            </button>

            <button
                v-if="actions.includes('delete')"
                class="actions-btn delete bg-control text-danger border-control-border hover:bg-danger-surface
                    hover:text-danger-hover hover:border-danger-border"
                @click="emit('delete')"
            >
                <Icon name="solar:trash-bin-trash-bold" />
                Delete
            </button>
        </div>

        <div
            v-if="showInfo"
            class="details-info w-full bg-surface border border-divider rounded-3xl overflow-hidden"
        >
            <div class="info-title [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-accent [&_.icon]:size-4 [&_.icon]:shrink-0
                [&_.icon]:text-accent h-12 py-0 px-[0.9rem] flex items-center gap-[0.45rem] text-foreground border-b
                border-b-divider text-[0.85rem] font-semibold">
                <Icon name="solar:info-circle-bold" />
                Information
            </div>

            <slot name="info" />
        </div>

        <ShareBox
            :item-id="itemId"
            :item-type="itemType"
        />
    </div>
</template>

<script setup lang="ts">
type Action = 'download' | 'rename' | 'copy' | 'favorite' | 'delete'

withDefaults(
    defineProps<{
        itemId: string
        itemType: 'file' | 'folder' | 'note'
        actions?: Action[]
        isFavorite?: boolean
        isCopying?: boolean
        canCopy?: boolean
        showInfo: boolean
    }>(),
    {
        actions: () => ['rename', 'favorite', 'delete'],
        isFavorite: false,
        isCopying: false,
        canCopy: false,
        showInfo: true
    }
)

const emit = defineEmits<{
    download: []
    rename: []
    copy: []
    favorite: []
    delete: []
}>()
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";

@layer components {
    .actions-btn {
        @apply details-action-icons w-full min-w-0 h-10 py-0 px-2 flex;
        @apply items-center justify-center gap-2 border rounded-md text-sm font-medium;
        @apply whitespace-nowrap cursor-pointer transition-colors duration-200 leading-normal;
        @apply nth-2:row-start-2 nth-2:col-start-1;
        @apply max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1 max-tiny:gap-1;
    }
}
</style>
