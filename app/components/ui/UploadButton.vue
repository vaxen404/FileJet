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
            class="upload-button w-max min-w-32 h-control flex items-center justify-between gap-3 bg-primary text-white
            py-0 px-3 text-control-size font-medium border-0 rounded-control whitespace-nowrap shrink-0
            cursor-pointer transition-all duration-200 ease-[ease] leading-normal disabled:opacity-50
            disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
            focus-visible:outline-offset-3 hover:enabled:bg-primary/85 hover:enabled:-translate-y-[0.5px]
            active:translate-y-0"
            :disabled="disabled"
            @click="openPicker"
        >
            <span class="upload-left inline-flex items-center gap-2">
                <Icon
                    name="solar:cloud-upload-bold"
                    class="upload-icon block text-control-icon shrink-0 size-control-icon"
                />
                <span>{{ text }}</span>
            </span>

            <Icon
                name="solar:alt-arrow-down-linear"
                class="small-arrow block text-control-icon shrink-0 size-control-icon"
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
