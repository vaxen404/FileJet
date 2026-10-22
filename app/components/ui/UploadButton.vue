<template>
    <div class="upload-control">
        <input
            ref="fileInput"
            type="file"
            class="file-input"
            multiple
            :accept="accept"
            :webkitdirectory="mode === 'folder' ? '' : undefined"
            :disabled="disabled"
            @change="handleFileChange"
        />

        <button
            type="button"
            class="upload-button"
            :disabled="disabled"
            @click="openPicker"
        >
            <span class="upload-left">
                <Icon
                    name="solar:cloud-upload-bold"
                    class="upload-icon"
                />
                <span>{{ text }}</span>
            </span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="small-arrow"
            />
        </button>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        text?: string
        mode?: 'file' | 'folder'
        accept?: string
        disabled?: boolean
    }>(),
    {
        text: 'Upload',
        mode: 'file'
    }
)

const emit = defineEmits<{
    files: [files: FileList]
    folder: [files: FileList]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const openPicker = () => {
    if (props.disabled) return

    fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement

    if (props.disabled || !input.files?.length) return

    if (props.mode === 'folder') emit('folder', input.files)
    else emit('files', input.files)

    input.value = ''
}
</script>

<style scoped>
.upload-control {
    display: inline-flex;
    flex-shrink: 0;
}

.file-input {
    display: none;
}

.upload-button {
    width: max-content;
    min-width: 8rem;
    height: var(--ui-control-height, 2.5rem);

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;

    background: #3c47be;
    color: #ffffff;

    padding: 0 0.75rem;

    font-size: var(--ui-control-font-size, 0.875rem);
    font-weight: 500;

    border: none;
    border-radius: var(--ui-control-radius, 8px);
    white-space: nowrap;
    flex-shrink: 0;

    cursor: pointer;

    box-sizing: border-box;

    transition: all 0.2s ease;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
}

.upload-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.upload-button:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 3px;
}

.upload-button:hover:not(:disabled) {
    background: #4a56d4;
    transform: translateY(-0.5px);
}

.upload-button:active {
    transform: translateY(0);
}

.upload-left {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.upload-icon,
.small-arrow {
    display: block;
    width: var(--ui-control-icon-size, 1.125rem);
    height: var(--ui-control-icon-size, 1.125rem);
    font-size: var(--ui-control-icon-size, 1.125rem);
    flex-shrink: 0;
}
</style>
