<template>
    <Teleport to="body">
        <dialog
            ref="dialog"
            class="folder-modal w-[min(28rem,_calc(100vw_-_2rem))] max-h-[calc(100dvh_-_2rem)] p-0 overflow-y-auto
                text-foreground bg-surface border border-control-border rounded-2xl shadow-[0_24px_80px_#0006]
                backdrop:bg-[#0009]"
            @cancel.prevent="close"
            @click.self="close"
        >
            <form class="p-6" @submit.prevent="save">
                <div class="modal-header flex items-center gap-3">
                    <div class="modal-icon grid place-items-center shrink-0 text-accent bg-accent/12 rounded-[10px] text-2xl
                        leading-[inherit] size-11"><Icon name="solar:folder-bold" /></div>
                    <div class="modal-heading flex-1 min-w-0">
                        <h2 class="m-0 text-[1.1rem]" :id="`${id}-title`">
                            {{ isEditing ? 'Rename folder' : 'New folder' }}
                        </h2>
                        <p class="mt-[0.35rem] mr-0 mb-0 ml-0 text-heading-muted text-[0.8rem] leading-normal" :id="`${id}-description`">
                            {{
                                isEditing
                                    ? 'Choose a new name for your folder.'
                                    : 'Keep your files organized in one place.'
                            }}
                        </p>
                    </div>
                    <button
                        type="button"
                        class="close-button inline-flex items-center justify-center gap-2 min-h-8 p-0 border-0 rounded-md
                            text-[1.35rem] cursor-pointer w-8 shrink-0 text-heading-muted bg-transparent disabled:opacity-50
                            disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                            focus-visible:outline-offset-3"
                        :disabled="isLoading"
                        @click="close"
                    >
                        <Icon name="solar:close-circle-linear" />
                    </button>
                </div>
                <div class="form-field flex flex-col gap-2 my-6 mx-0">
                    <label class="text-sm leading-[inherit] font-medium" :for="`${id}-name`">Folder name</label>
                    <input class="w-full min-h-11 py-[0.6rem] px-3 text-foreground bg-canvas border border-control-border rounded-md
                        text-sm focus:outline-none focus:valid-field:border-accent is-invalid:border-danger
                        leading-[inherit]"
                        :id="`${id}-name`"
                        ref="nameInput"
                        v-model="name"
                        :class="{ invalid: Boolean(message) }"
                        type="text"
                        placeholder="Untitled folder"
                        autocomplete="off"
                        maxlength="255"
                        required
                        :disabled="isLoading"
                        @input="saveError = ''"
                    />
                    <p
                        v-if="message"
                        :id="`${id}-error`"
                        class="form-error m-0 text-danger text-[0.8rem] leading-normal wrap-anywhere"
                    >
                        {{ message }}
                    </p>
                </div>
                <div class="modal-footer flex justify-end flex-wrap gap-2">
                    <button
                        type="button"
                        class="cancel-button inline-flex items-center justify-center gap-2 min-h-10 py-0 px-[0.9rem] border
                            border-control-border rounded-md text-sm cursor-pointer text-content bg-raised
                            hover:enabled:bg-control-border disabled:opacity-50 disabled:cursor-not-allowed
                            focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-3
                            leading-[inherit]"
                        :disabled="isLoading"
                        @click="close"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="save-button inline-flex items-center justify-center gap-2 min-h-10 py-0 px-[0.9rem] border
                            rounded-md text-sm cursor-pointer text-on-primary bg-primary border-primary
                            hover:enabled:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2
                            focus-visible:outline-accent focus-visible:outline-offset-3 leading-[inherit]"
                        :disabled="!canSubmit"
                    >
                        <Icon :name="isEditing ? 'solar:pen-bold' : 'solar:add-circle-bold'" />
                        {{ isLoading ? 'Saving...' : isEditing ? 'Save changes' : 'Create folder' }}
                    </button>
                </div>
            </form>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import { folderNameSchema } from '~~/shared/schemas/folder'

const props = withDefaults(
    defineProps<{
        open: boolean
        folder?: { id: string; name: string } | null
        parentFolderId?: string
    }>(),
    { folder: null }
)

const emit = defineEmits<{ close: []; saved: [] }>()
const id = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const name = ref('')
const saveError = ref('')
const { isLoading, createFolder, renameFolder } = useFolderActions()
const { openToast } = useToast()
const isEditing = computed(() => Boolean(props.folder))
const validation = computed(() => folderNameSchema.safeParse(name.value))

const message = computed(
    () =>
        saveError.value ||
        (name.value && !validation.value.success ? validation.value.error.issues[0]?.message : '')
)

const canSubmit = computed(
    () =>
        validation.value.success &&
        !isLoading.value &&
        (!props.folder || name.value.trim() !== props.folder.name)
)

const close = () => {
    if (!isLoading.value) emit('close')
}

watch(
    () => [props.open, props.folder] as const,
    async () => {
        if (!props.open) {
            dialog.value?.close()

            return
        }

        name.value = props.folder?.name ?? ''
        saveError.value = ''
        await nextTick()

        if (!props.open || !dialog.value?.isConnected) return

        if (!dialog.value.open) dialog.value.showModal()

        nameInput.value?.focus()
        nameInput.value?.select()
    },
    { immediate: true, flush: 'post' }
)

const save = async () => {
    if (!canSubmit.value || !validation.value.success) return

    saveError.value = ''

    try {
        if (props.folder) await renameFolder(props.folder.id, validation.value.data)
        else await createFolder(validation.value.data, props.parentFolderId)

        openToast(
            isEditing.value ? 'Folder renamed successfully.' : 'Folder created successfully.',
            'success', { notification: { title: isEditing.value ? 'Folder renamed' : 'Folder created', category: 'library', href: '/folders' } }
        )
        emit('saved')
        emit('close')
    } catch (error: any) {
        saveError.value = error.data?.message || error.message || 'Could not save folder.'
    }
}
</script>
