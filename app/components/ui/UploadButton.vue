<template>
    <div>
        <input
            ref="fileInput"
            type="file"
            class="file-input"
            multiple
            @change="handleFileChange"
        >

        <button
            type="button"
            class="upload-button"
            @click="openPicker"
        >
            <div class="upload-left">
                <Icon name="solar:cloud-upload-bold" />
                {{ text }}
            </div>

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
    }>(),
    {
        text: 'Upload',
        mode: 'file'
    }
)

const emit = defineEmits<{
    files: [files: FileList]
    folder: [handle: FileSystemDirectoryHandle]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const openPicker = async () => {
    if (props.mode === 'folder') {
        if ('showDirectoryPicker' in window) {
            const handle = await (window as any).showDirectoryPicker()

            emit('folder', handle)
            return
        }

        alert('Your browser does not support folder selection. Please use Chrome or Edge.')
        return
    }

    fileInput.value?.click()
}
const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement

    if (!input.files) return

    emit('files', input.files)

    input.value = ''
}
</script>

<style scoped>
.file-input {
    display: none;
}

.upload-button {
    width: 8rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: space-between;

    background: #3c47be;
    color: #ffffff;

    padding: 0.2rem 0.5rem;

    font-size: 1rem;
    font-weight: 500;

    border: none;
    border-radius: 0.625rem;

    cursor: pointer;

    box-sizing: border-box;

    transition: all 0.2s ease;
}

.upload-button:hover {
    background: #4a56d4;
    transform: translateY(-0.5px);
}

.upload-button:active {
    transform: translateY(0);
}

.upload-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.upload-left svg {
    font-size: 1.05rem;
}

.small-arrow {
    font-size: 1rem;
    flex-shrink: 0;
}
</style>