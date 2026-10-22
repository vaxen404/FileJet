<template>
    <Teleport to="body">
        <section
            v-if="active"
            class="upload-status fixed right-4 bottom-4 z-1000 w-72 max-w-[calc(100vw_-_2rem)] p-3 bg-surface border
            border-divider rounded-xl pointer-events-none"
        >
            <div class="upload-status-heading flex items-center gap-2 mb-2 text-[#d5d5da] text-sm font-medium leading-normal">
                <Icon class="text-accent shrink-0" name="solar:cloud-upload-bold" />
                <span>{{ processing ? 'Processing...' : label }}</span>
                <span
                    v-if="value !== null"
                    class="upload-percentage ml-auto text-muted text-xs leading-[inherit]"
                    >{{ value }}%</span
                >
            </div>
            <div class="upload-progress h-2 overflow-hidden bg-divider rounded-sm">
                <div
                    class="upload-progress-bar h-full bg-primary rounded-sm is-indeterminate:opacity-45"
                    :class="{ indeterminate: value === null }"
                    :style="{ width: value === null ? '100%' : `${value}%` }"
                />
            </div>
        </section>
    </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        active: boolean
        progress: number | null
        processing?: boolean
        label?: string
    }>(),
    { processing: false, label: 'Uploading files...' }
)

const value = computed(() =>
    props.progress === null ? null : Math.max(0, Math.min(100, props.progress))
)
</script>
