<template>
    <div class="file-page">
        <section class="file-workspace">
            <div class="preview-card">
                <slot />
            </div>
        </section>
        <aside class="file-panel">
            <section class="file-information">
                <div class="file-heading">
                    <div class="file-heading-text">
                        <h1>{{ title }}</h1>
                        <p class="file-summary">{{ summary }}</p>
                    </div>
                    <button
                        type="button"
                        class="close-details"
                        @click="$emit('back')"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
                        >
                            <path
                                d="m6 6 12 12M18 6 6 18"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>
                <div class="file-actions">
                    <button
                        type="button"
                        class="action-button download-button"
                        :disabled="busy"
                        @click="$emit('download')"
                    >
                        <Icon
                            name="solar:download-linear"
                            size="1.25rem"
                        />
                        Download
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action"
                        :class="{ 'is-favorite': isFavorite }"
                        :disabled="busy"
                        @click="$emit('favorite')"
                    >
                        <Icon
                            :name="isFavorite ? 'solar:star-bold' : 'solar:star-linear'"
                            size="1.25rem"
                        />
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action"
                        :disabled="busy"
                        @click="$emit('rename')"
                    >
                        <Icon
                            name="solar:pen-linear"
                            size="1.25rem"
                        />
                    </button>
                    <button
                        type="button"
                        class="action-button icon-action delete-button"
                        :disabled="busy"
                        @click="$emit('delete')"
                    >
                        <Icon
                            name="solar:trash-bin-trash-linear"
                            size="1.25rem"
                        />
                    </button>
                </div>
                <div
                    class="detail-tabs"
                    @keydown="navigateTabs"
                >
                    <button
                        v-for="tab in tabs"
                        :id="itemType + '-' + tab + '-tab'"
                        :key="tab"
                        type="button"
                        :tabindex="activeTab === tab ? 0 : -1"
                        :class="{ active: activeTab === tab }"
                        :disabled="busy"
                        @click="activeTab = tab"
                    >
                        {{ tab[0]!.toUpperCase() + tab.slice(1) }}
                    </button>
                </div>
                <div
                    v-show="activeTab === 'details'"
                    :id="itemType + '-details-panel'"
                    class="tab-panel"
                    tabindex="0"
                >
                    <dl class="file-metadata">
                        <div
                            v-for="row in metadata"
                            :key="row.label"
                            class="metadata-row"
                        >
                            <dt>{{ row.label }}</dt>
                            <dd>{{ row.value ?? 'Unavailable' }}</dd>
                        </div>
                    </dl>
                </div>
                <div
                    v-show="activeTab === 'edit'"
                    :id="itemType + '-edit-panel'"
                    class="tab-panel"
                    tabindex="0"
                >
                    <slot name="edit" />
                </div>
                <div
                    v-show="activeTab === 'share'"
                    :id="itemType + '-share-panel'"
                    class="tab-panel"
                    tabindex="0"
                >
                    <ShareBox
                        :item-id="itemId"
                        :item-type="itemType"
                        :initial-state="share"
                        embedded
                        @changed="$emit('shareChanged', $event)"
                    />
                </div>
            </section>
        </aside>
    </div>
</template>

<script setup lang="ts">
import type { ShareState } from '~~/shared/types/share'

const props = defineProps<{
    title: string
    summary: string
    itemId: string
    itemType: 'note' | 'folder'
    metadata: { label: string; value: string | number | null }[]
    share: ShareState
    isFavorite: boolean
    busy: boolean
}>()

const activeTab = defineModel<'details' | 'edit' | 'share'>({ default: 'details' })
const tabs = ['details', 'edit', 'share'] as const

defineEmits<{
    download: []
    favorite: []
    rename: []
    delete: []
    back: []
    shareChanged: [state: ShareState]
}>()

const navigateTabs = async (event: KeyboardEvent) => {
    if (props.busy || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    const index = tabs.indexOf(activeTab.value)

    const next =
        event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 2
              : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3

    activeTab.value = tabs[next]!
    await nextTick()
    document.getElementById(props.itemType + '-' + activeTab.value + '-tab')?.focus()
}
</script>

<style scoped>
.file-page {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 27rem;
    gap: 1rem;
}

.file-workspace,
.file-panel {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.preview-card {
    flex: 1;
    min-height: 0;
    display: flex;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: var(--ui-panel-radius, 24px);
    overflow: hidden;
}

.file-panel {
    overflow-y: auto;
    overscroll-behavior: contain;
}

.file-information {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: var(--ui-panel-radius, 24px);
    box-sizing: border-box;
}

.file-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.file-heading-text {
    flex: 1;
    min-width: 0;
}

.file-heading h1 {
    margin: 0;
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.file-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0.375rem 0 0;
    color: #898991;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.close-details {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    color: #cfcfd5;
    background: transparent;
    border: none;
    border-radius: var(--ui-control-radius, 8px);
    cursor: pointer;
}

.close-details:hover {
    background: #29292e;
    color: #ffffff;
}

.file-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) repeat(3, 3.25rem);
    gap: 0.75rem;
}

.action-button {
    min-width: 0;
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: var(--ui-control-radius, 8px);
    box-sizing: border-box;
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.action-button:hover:not(:disabled) {
    background: #29292e;
    color: #ffffff;
    border-color: #3a3a41;
}

.icon-action {
    width: 3.25rem;
    padding: 0;
}

.icon-action.is-favorite {
    color: #8b7cff;
}

.download-button {
    background: #3c47be;
    color: #ffffff;
    border-color: #3c47be;
}

.download-button:hover:not(:disabled) {
    background: #4652d1;
    border-color: #4652d1;
}

.delete-button {
    background: #352024;
    color: #ff6b6b;
    border-color: #4a292d;
}

.delete-button:hover:not(:disabled) {
    background: #3a2024;
    color: #ff7d7d;
    border-color: #4a292d;
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.detail-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.25rem;
    padding: 3px;
    background: #151518;
    border: 1px solid #29292e;
    border-radius: var(--ui-control-radius, 8px);
}

.detail-tabs button {
    min-height: 2rem;
    padding: 0.375rem 0.5rem;
    color: #898991;
    background: transparent;
    border: none;
    border-radius: var(--ui-control-inner-radius, 4px);
    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
}

.detail-tabs button:hover {
    color: #ffffff;
}

.detail-tabs button.active {
    background: #242429;
    color: #ffffff;
    font-weight: 600;
}

.detail-tabs button:disabled {
    cursor: wait;
}

.tab-panel {
    min-width: 0;
}

.file-metadata {
    margin: 0;
    border: 1px solid #29292e;
    border-radius: 6px;
    overflow: hidden;
}

.metadata-row {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: start;
    gap: 0.75rem;
    padding: 0.5rem 0.875rem;
    border-bottom: 1px solid #29292e;
    font-size: 0.8125rem;
    line-height: 1.5;
}

.metadata-row:last-child {
    border-bottom: none;
}

.metadata-row dt {
    color: #898991;
}

.metadata-row dd {
    min-width: 0;
    margin: 0;
    color: #d5d5da;
    overflow-wrap: anywhere;
}

.file-page button:focus-visible,
.tab-panel:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 2px;
}

@media (max-width: 1100px) and (min-width: 901px) {
    .file-page {
        grid-template-columns: minmax(0, 1fr) 22rem;
        gap: 0.75rem;
    }

    .file-actions {
        gap: 0.5rem;
    }
}

@media (max-width: 900px) {
    .file-page {
        height: auto;
        min-height: 100%;
        grid-template-columns: minmax(0, 1fr);
    }

    .preview-card {
        flex: none;
        height: 36rem;
    }

    .file-panel {
        overflow: visible;
    }

    .file-information {
        flex: none;
    }
}

@media (max-width: 500px) {
    .preview-card {
        height: 24rem;
    }

    .file-information {
        padding: 0.75rem;
    }

    .file-actions {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.5rem;
    }

    .file-actions .download-button {
        grid-column: 1 / -1;
    }

    .icon-action {
        width: 100%;
    }

    .action-button {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }

    .metadata-row {
        gap: 0.5rem;
        padding: 0.5rem 0.625rem;
    }
}
</style>
