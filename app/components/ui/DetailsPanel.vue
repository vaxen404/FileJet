<template>
    <div class="details-panel">
        <div class="details-actions">
            <button
                v-if="actions.includes('download')"
                class="actions-btn download"
                @click="emit('download')"
            >
                <Icon name="solar:download-bold" />
                Download
            </button>

            <button
                v-if="actions.includes('rename')"
                class="actions-btn"
                @click="emit('rename')"
            >
                <Icon name="solar:pen-bold" />
                Rename
            </button>

            <button
                v-if="actions.includes('favorite')"
                class="actions-btn"
                @click="emit('favorite')"
            >
                <Icon :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'" />

                {{ isFavorite ? 'Remove Favorite' : 'Favorite' }}
            </button>

            <button
                v-if="itemType === 'file' && canCopy && actions.includes('copy')"
                type="button"
                class="actions-btn copy"
                :disabled="isCopying"
                :aria-busy="isCopying"
                @click="emit('copy')"
            >
                <Icon name="solar:copy-bold" />
                {{ isCopying ? 'Copying...' : 'Copy' }}
            </button>

            <button
                v-if="actions.includes('delete')"
                class="actions-btn delete"
                @click="emit('delete')"
            >
                <Icon name="solar:trash-bin-trash-bold" />
                Delete
            </button>
        </div>

        <div
            v-if="showInfo"
            class="details-info"
        >
            <div class="info-title">
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
type Action =
    | 'download' | 'rename' | 'copy' | 'favorite' | 'delete'

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
.details-panel {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.details-actions,
.details-info {
    width: 100%;
    box-sizing: border-box;
}

.details-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;
}

.actions-btn {
    width: 100%;
    min-width: 0;
    height: 2.5rem;
    padding: 0 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: #202024;
    color: #cfcfd5;
    border: 1px solid #303036;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    box-sizing: border-box;
    cursor: pointer;
    transition:
        background 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
    line-height: 1.5;
}

.actions-btn:hover {
    background: #29292e;
    color: #ffffff;
    border-color: #3a3a41;
}

.actions-btn.download {
    background: #3c47be;
    color: #ffffff;
    border-color: #3c47be;
}

.actions-btn.download:hover {
    background: #4652d1;
    border-color: #4652d1;
}

.actions-btn.delete {
    color: #ff6b6b;
}

.actions-btn.delete:hover {
    background: #352024;
    color: #ff7d7d;
    border-color: #4a292d;
}

.actions-btn :deep(svg),
.actions-btn :deep(.icon) {
    width: 0.95rem;
    height: 0.95rem;
    flex-shrink: 0;
}

.details-info {
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 24px;
    overflow: hidden;
}

.info-title {
    height: 3rem;
    padding: 0 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: #ffffff;
    border-bottom: 1px solid #29292e;
    font-size: 0.85rem;
    font-weight: 600;
    box-sizing: border-box;
}

.info-title :deep(svg),
.info-title :deep(.icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #8b7cff;
}

.details-info :deep(.info-row) {
    width: 100%;
    height: 2.75rem;
    padding: 0 0.9rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid #29292e;
    box-sizing: border-box;
}

.details-info :deep(.info-row:last-child) {
    border-bottom: none;
}

.details-info :deep(.info-label) {
    flex-shrink: 0;
    color: #898991;
    font-size: 0.75rem;
    line-height: 1.5;
}

.details-info :deep(.info-value) {
    min-width: 0;
    max-width: 68%;
    color: #d5d5da;
    font-size: 0.75rem;
    font-weight: 500;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
}

.details-actions > .actions-btn:nth-child(2) {
    grid-row: 2;
    grid-column: 1;
}

@media (max-width: 360px) {
    .actions-btn {
        font-size: 0.75rem;
        padding: 0 0.25rem;
        gap: 0.25rem;
    }
}
</style>
