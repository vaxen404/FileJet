<template>
    <div class="upload-control inline-flex shrink-0">
        <input
            ref="fileInput"
            type="file"
            class="file-input hidden"
            multiple
            :accept="accept"
            :webkitdirectory="mode === 'folder' ? '' : undefined"
            :disabled="disabled"
            @change="handleFileChange"
        />

        <button
            type="button"
            class="w-max min-w-32 h-10 max-mobile:h-11 pointer-coarse:h-11 flex items-center justify-between gap-3
                bg-primary text-on-primary py-0 px-3 text-sm font-medium border-0 rounded-lg whitespace-nowrap
                shrink-0 cursor-pointer transition-colors duration-200 leading-normal disabled:opacity-50
                disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                focus-visible:outline-offset-3 hover:enabled:bg-primary/85"
            :disabled="disabled"
            @click="openPicker"
        >
            <span class="inline-flex items-center gap-2">
                <Icon
                    name="solar:cloud-upload-bold"
                    class="block text-lg shrink-0 size-4.5"
                />
                {{ text }}
            </span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="block text-lg shrink-0 size-4.5"
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
