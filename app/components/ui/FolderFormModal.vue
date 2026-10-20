<template>
    <Teleport to="body">
        <dialog
            ref="dialog"
            class="folder-modal"
            :aria-labelledby="`${id}-title`"
            :aria-describedby="`${id}-description`"
            @cancel.prevent="close"
            @click.self="close"
        >
            <form :aria-busy="isLoading" @submit.prevent="save">
                <div class="modal-header">
                    <div class="modal-icon"><Icon name="solar:folder-bold" /></div>
                    <div class="modal-heading">
                        <h2 :id="`${id}-title`">{{ isEditing ? 'Rename folder' : 'New folder' }}</h2>
                        <p :id="`${id}-description`">{{ isEditing ? 'Choose a new name for your folder.' : 'Keep your files organized in one place.' }}</p>
                    </div>
                    <button type="button" class="close-button" aria-label="Close" :disabled="isLoading" @click="close">
                        <Icon name="solar:close-circle-linear" />
                    </button>
                </div>
                <div class="form-field">
                    <label :for="`${id}-name`">Folder name</label>
                    <input
                        :id="`${id}-name`"
                        ref="nameInput"
                        v-model="name"
                        type="text"
                        placeholder="Untitled folder"
                        autocomplete="off"
                        maxlength="255"
                        required
                        :disabled="isLoading"
                        :aria-invalid="Boolean(message)"
                        :aria-describedby="message ? `${id}-error` : undefined"
                        @input="saveError = ''"
                    />
                    <p v-if="message" :id="`${id}-error`" class="form-error" role="alert">{{ message }}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="cancel-button" :disabled="isLoading" @click="close">Cancel</button>
                    <button type="submit" class="save-button" :disabled="!canSubmit">
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

const props = withDefaults(defineProps<{
    open: boolean
    folder?: { id: string; name: string } | null
    parentFolderId?: string
}>(), { folder: null })

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
const message = computed(() => saveError.value || (name.value && !validation.value.success
    ? validation.value.error.issues[0]?.message : ''))
const canSubmit = computed(() => validation.value.success && !isLoading.value &&
    (!props.folder || name.value.trim() !== props.folder.name))

const close = () => {
    if (!isLoading.value) emit('close')
}

watch(() => [props.open, props.folder] as const, async () => {
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
}, { immediate: true, flush: 'post' })

const save = async () => {
    if (!canSubmit.value || !validation.value.success) return
    saveError.value = ''
    try {
        if (props.folder) await renameFolder(props.folder.id, validation.value.data)
        else await createFolder(validation.value.data, props.parentFolderId)
        openToast(isEditing.value ? 'Folder renamed successfully.' : 'Folder created successfully.', 'success')
        emit('saved')
        emit('close')
    } catch (error: any) {
        saveError.value = error.data?.message || error.message || 'Could not save folder.'
    }
}
</script>

<style scoped>
.folder-modal {
    width: min(28rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    overflow-y: auto;
    color: #f3f3f5;
    background: #1a1a1d;
    border: 1px solid #35353c;
    border-radius: 16px;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 24px 80px #0006;
}
.folder-modal::backdrop { background: #0009; }
.folder-modal form { padding: 1.5rem; }
.modal-header { display: flex; align-items: center; gap: 0.75rem; }
.modal-heading { flex: 1; min-width: 0; }
.modal-icon { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; flex-shrink: 0; color: #6ea8ff; background: #1f2d4a; border-radius: 10px; font-size: 1.5rem; }
h2 { margin: 0; font-size: 1.1rem; }
p { margin: 0.35rem 0 0; color: #a3a3ab; font-size: 0.8rem; line-height: 1.5; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.5rem; padding: 0 0.9rem; border: 1px solid #35353c; border-radius: 6px; font: inherit; font-size: 0.875rem; cursor: pointer; }
.close-button { padding: 0; width: 2rem; min-height: 2rem; flex-shrink: 0; border: 0; color: #a3a3ab; background: transparent; font-size: 1.35rem; }
.form-field { display: flex; flex-direction: column; gap: 0.5rem; margin: 1.5rem 0; }
label { font-size: 0.875rem; font-weight: 500; }
input { width: 100%; box-sizing: border-box; min-height: 2.75rem; padding: 0.6rem 0.75rem; color: #f3f3f5; background: #121214; border: 1px solid #35353c; border-radius: 6px; font: inherit; font-size: 0.875rem; }
input:focus { outline: none; }
input:focus:not([aria-invalid='true']) { border-color: #8b7cff; }
input[aria-invalid='true'] { border-color: #ff6b6b; }
.form-error { margin: 0; color: #ff8181; overflow-wrap: anywhere; }
.modal-footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 0.5rem; }
.cancel-button { color: #d5d5da; background: #242429; }
.cancel-button:hover:not(:disabled) { background: #303036; }
.save-button { color: white; background: #3c47be; border-color: #3c47be; }
.save-button:hover:not(:disabled) { background: #4a56d4; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button:focus-visible { outline: 2px solid #8b7cff; outline-offset: 3px; }
</style>
