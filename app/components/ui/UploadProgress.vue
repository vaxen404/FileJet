<template>
    <Teleport to="body">
        <section v-if="active" class="upload-status" aria-label="Upload status">
            <div class="upload-status-heading" role="status" aria-live="polite">
                <Icon name="solar:cloud-upload-bold" />
                <span>{{ processing ? 'Processing...' : label }}</span>
                <span v-if="value !== null" class="upload-percentage">{{ value }}%</span>
            </div>
            <div class="upload-progress" role="progressbar" :aria-label="label" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="value ?? undefined" :aria-valuetext="processing ? 'Processing...' : value === null ? 'Uploading...' : `${value}%`">
                <div class="upload-progress-bar" :class="{ indeterminate: value === null }" :style="{ width: value === null ? '100%' : `${value}%` }" />
            </div>
        </section>
    </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ active: boolean, progress: number | null, processing?: boolean, label?: string }>(), { processing: false, label: 'Uploading files...' })
const value = computed(() => props.progress === null ? null : Math.max(0, Math.min(100, props.progress)))
</script>

<style scoped>
.upload-status { position: fixed; right: 1rem; bottom: 1rem; z-index: 1000; width: 18rem; max-width: calc(100vw - 2rem); padding: 0.75rem; background: #1a1a1d; border: 1px solid #29292e; border-radius: 12px; box-sizing: border-box; pointer-events: none; }
.upload-status-heading { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: #d5d5da; font-size: 0.875rem; font-weight: 500; line-height: 1.5; }
.upload-status-heading :deep(.iconify) { color: #8b7cff; flex-shrink: 0; }
.upload-percentage { margin-left: auto; color: #898991; font-size: 0.75rem; }
.upload-progress { height: 0.5rem; overflow: hidden; background: #29292e; border-radius: 4px; }
.upload-progress-bar { height: 100%; background: #3c47be; border-radius: 4px; }
.upload-progress-bar.indeterminate { opacity: 0.45; }
</style>
