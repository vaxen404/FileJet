<template>
    <div class="details-panel w-full min-w-0 flex flex-col gap-3">
        <div class="details-actions w-full grid grid-cols-2 gap-2 p-2 bg-surface border border-divider rounded-3xl">
            <button
                v-if="actions.includes('download')"
                class="actions-btn details-action-icons download w-full min-w-0 h-10 py-0 px-2 flex items-center
                justify-center gap-2 bg-primary text-on-primary border rounded-md text-sm font-medium whitespace-nowrap
                cursor-pointer transition-colors duration-200 ease-[ease] leading-normal border-primary
                hover:bg-primary/85 hover:text-on-primary hover:border-primary nth-2:row-start-2 nth-2:col-start-1
                max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1 max-tiny:gap-1"
                @click="emit('download')"
            >
                <Icon name="solar:download-bold" />
                Download
            </button>

            <button
                v-if="actions.includes('rename')"
                class="actions-btn details-action-icons w-full min-w-0 h-10 py-0 px-2 flex items-center justify-center gap-2
                bg-control text-content border border-control-border rounded-md text-sm font-medium
                whitespace-nowrap cursor-pointer transition-colors duration-200 ease-[ease] leading-normal
                hover:bg-divider hover:text-foreground hover:border-hover-border nth-2:row-start-2 nth-2:col-start-1
                max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1 max-tiny:gap-1"
                @click="emit('rename')"
            >
                <Icon name="solar:pen-bold" />
                Rename
            </button>

            <button
                v-if="actions.includes('favorite')"
                class="actions-btn details-action-icons w-full min-w-0 h-10 py-0 px-2 flex items-center justify-center gap-2
                bg-control text-content border border-control-border rounded-md text-sm font-medium
                whitespace-nowrap cursor-pointer transition-colors duration-200 ease-[ease] leading-normal
                hover:bg-divider hover:text-foreground hover:border-hover-border nth-2:row-start-2 nth-2:col-start-1
                max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1 max-tiny:gap-1"
                @click="emit('favorite')"
            >
                <Icon :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'" />

                {{ isFavorite ? 'Remove Favorite' : 'Favorite' }}
            </button>

            <button
                v-if="itemType === 'file' && canCopy && actions.includes('copy')"
                type="button"
                class="actions-btn details-action-icons copy w-full min-w-0 h-10 py-0 px-2 flex items-center justify-center
                gap-2 bg-control text-content border border-control-border rounded-md text-sm font-medium
                whitespace-nowrap cursor-pointer transition-colors duration-200 ease-[ease] leading-normal
                hover:bg-divider hover:text-foreground hover:border-hover-border nth-2:row-start-2 nth-2:col-start-1
                max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1 max-tiny:gap-1"
                :disabled="isCopying"
                @click="emit('copy')"
            >
                <Icon name="solar:copy-bold" />
                {{ isCopying ? 'Copying...' : 'Copy' }}
            </button>

            <button
                v-if="actions.includes('delete')"
                class="actions-btn details-action-icons delete w-full min-w-0 h-10 py-0 px-2 flex items-center
                justify-center gap-2 bg-control text-danger border border-control-border rounded-md text-sm
                font-medium whitespace-nowrap cursor-pointer transition-colors duration-200 ease-[ease]
                leading-normal hover:bg-danger-surface hover:text-danger-hover hover:border-danger-border nth-2:row-start-2
                nth-2:col-start-1 max-tiny:text-xs max-tiny:leading-[inherit] max-tiny:py-0 max-tiny:px-1
                max-tiny:gap-1"
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
