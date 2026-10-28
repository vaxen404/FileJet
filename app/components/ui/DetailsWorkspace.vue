<template>
    <div class="file-page min-w-0 min-h-0 grid grid-cols-[minmax(0,_1fr)_27rem] gap-4
        details-middle:grid-cols-[minmax(0,_1fr)_22rem] details-middle:gap-3 max-preview:h-auto
        max-preview:min-h-full max-preview:grid-cols-1 size-full">
        <section class="file-workspace min-w-0 min-h-0 flex flex-col gap-3">
            <div class="preview-card flex-1 min-h-0 flex bg-surface border border-divider rounded-panel overflow-hidden
                max-preview:flex-none max-preview:h-144 max-phone:h-96">
                <slot />
            </div>
        </section>
        <aside class="file-panel min-w-0 min-h-0 flex flex-col gap-3 overflow-y-auto overscroll-contain
            max-preview:overflow-visible">
            <section class="file-information flex-none min-w-0 flex flex-col gap-3 p-3.5 bg-surface border border-divider
                rounded-panel max-preview:flex-none max-phone:p-3">
                <div class="file-heading flex items-start gap-3">
                    <div class="file-heading-text flex-1 min-w-0">
                        <h1 class="m-0 text-foreground text-xl font-semibold leading-[1.35] wrap-anywhere">{{ title }}</h1>
                        <p class="file-summary flex items-center flex-wrap gap-1.5 mt-1.5 mr-0 mb-0 ml-0 text-muted text-[0.8125rem]
                            leading-normal">{{ summary }}</p>
                    </div>
                    <button
                        type="button"
                        class="close-details shrink-0 grid place-items-center p-0 text-content bg-transparent border-0
                        rounded-control cursor-pointer hover:bg-divider hover:text-foreground focus-visible:outline-2
                        focus-visible:outline-accent focus-visible:outline-offset-2 size-7"
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
                <div class="file-actions grid grid-cols-[minmax(0,_1fr)_repeat(3,_3.25rem)] gap-3 details-middle:gap-2
                    max-phone:grid-cols-3 max-phone:gap-2">
                    <button
                        type="button"
                        class="action-button download-button min-w-0 min-h-11 inline-flex items-center justify-center gap-2 py-2
                        px-3.5 text-on-primary bg-primary border rounded-control text-control-size font-medium leading-normal
                        cursor-pointer transition-colors duration-200 ease-[ease] border-primary hover:enabled:bg-primary/85
                        hover:enabled:text-on-primary hover:enabled:border-primary disabled:opacity-60
                        disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:col-span-full max-phone:pl-2 max-phone:pr-2"
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
                        class="action-button icon-action min-w-0 min-h-11 inline-flex items-center justify-center gap-2 p-0
                        text-content bg-control border border-control-border rounded-control text-control-size font-medium
                        leading-normal cursor-pointer transition-colors duration-200 ease-[ease] w-13
                        hover:enabled:bg-divider hover:enabled:text-foreground hover:enabled:border-hover-border favorite:text-accent
                        disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2 max-phone:pr-2"
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
                        class="action-button icon-action min-w-0 min-h-11 inline-flex items-center justify-center gap-2 p-0
                        text-content bg-control border border-control-border rounded-control text-control-size font-medium
                        leading-normal cursor-pointer transition-colors duration-200 ease-[ease] w-13
                        hover:enabled:bg-divider hover:enabled:text-foreground hover:enabled:border-hover-border disabled:opacity-60
                        disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2 max-phone:pr-2"
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
                        class="action-button icon-action delete-button min-w-0 min-h-11 inline-flex items-center justify-center
                        gap-2 p-0 text-danger bg-danger-surface border rounded-control text-control-size font-medium
                        leading-normal cursor-pointer transition-colors duration-200 ease-[ease] w-13 border-danger-border
                        hover:enabled:bg-danger-surface hover:enabled:text-danger-hover hover:enabled:border-danger-border
                        disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2 max-phone:w-full max-phone:pl-2 max-phone:pr-2"
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
                    class="detail-tabs grid grid-cols-3 gap-1 p-[3px] bg-input border border-divider rounded-control"
                    @keydown="navigateTabs"
                >
                    <button class="min-h-8 py-1.5 px-2 text-muted bg-transparent border-0 rounded-control-inner text-control-size
                        font-medium leading-normal cursor-pointer hover:text-foreground is-active:bg-raised is-active:text-foreground
                        is-active:font-semibold disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                        focus-visible:outline-offset-2"
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
                    class="tab-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    tabindex="0"
                >
                    <dl class="file-metadata m-0 border border-divider rounded-md overflow-hidden">
                        <div
                            v-for="row in metadata"
                            :key="row.label"
                            class="metadata-row grid grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] items-start gap-3 py-2 px-3.5 border-b
                            border-b-divider text-[0.8125rem] leading-normal last:border-b-0 max-phone:gap-2 max-phone:py-2
                            max-phone:px-2.5"
                        >
                            <dt class="text-muted">{{ row.label }}</dt>
                            <dd class="min-w-0 m-0 text-content wrap-anywhere">{{ row.value ?? 'Unavailable' }}</dd>
                        </div>
                    </dl>
                </div>
                <div
                    v-show="activeTab === 'edit'"
                    :id="itemType + '-edit-panel'"
                    class="tab-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    tabindex="0"
                >
                    <slot name="edit" />
                </div>
                <div
                    v-show="activeTab === 'share'"
                    :id="itemType + '-share-panel'"
                    class="tab-panel min-w-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
