<template>
    <Teleport to="body">
        <Transition name="modal">
            <div
                v-if="open"
                class="note-overlay fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/65"
                @click.self="closeModal"
            >
                <div
                    ref="dialog"
                    class="note-modal-conteiner w-full max-w-144 max-h-[calc(100dvh_-_2rem)] overflow-y-auto bg-surface border
                    border-divider rounded-xl p-6 text-content max-phone:p-4"
                    @keydown.esc="closeModal"
                    @keydown.tab="trapFocus"
                >
                    <div class="note-modal-header flex items-center gap-3 justify-between">
                        <div class="header-left flex items-center gap-3">
                            <div class="note-icon flex items-center justify-center shrink-0 text-accent bg-accent/12 rounded-md size-10">
                                <Icon name="solar:notes-bold-duotone" />
                            </div>

                            <div class="header-text min-w-0">
                                <h2 class="m-0 text-foreground text-[1.1rem] font-semibold" id="note-modal-title">
                                    {{ isEditing ? 'Edit note' : 'Create a note' }}
                                </h2>

                                <p class="mt-1 mr-0 mb-0 ml-0 text-muted text-sm leading-normal">
                                    {{
                                        isEditing
                                            ? 'Make changes to your note.'
                                            : 'Capture your ideas and thoughts.'
                                    }}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="clouse-button flex items-center justify-center shrink-0 p-0 text-label border border-control-border
                            bg-raised rounded-md cursor-pointer hover:enabled:bg-raised disabled:opacity-60
                            disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent
                            focus-visible:outline-offset-2 size-8"
                            :disabled="isLoading"
                            @click="closeModal"
                        >
                            <Icon name="solar:close-circle-linear" />
                        </button>
                    </div>

                    <form @submit.prevent="saveNote">
                        <div class="note-modal-body flex flex-col gap-4 py-4 px-0">
                            <div class="form-field flex flex-col gap-2">
                                <div class="fielad-header flex items-center justify-between gap-2 text-sm leading-normal">
                                    <label for="note-form-title"> Title </label>

                                    <span class="text-muted text-xs leading-[inherit]">{{ title.length }} / 32</span>
                                </div>

                                <input class="w-full min-w-0 p-3 text-content bg-input border border-control-border rounded-md text-sm
                                    leading-normal outline-none focus:border-accent disabled:opacity-60 disabled:cursor-wait"
                                    id="note-form-title"
                                    ref="titleInput"
                                    v-model="title"
                                    type="text"
                                    maxlength="32"
                                    placeholder="Enter your title..."
                                    autocomplete="off"
                                    required
                                    :disabled="isLoading"
                                />
                            </div>

                            <div class="form-field flex flex-col gap-2">
                                <div class="field-header flex items-center justify-between gap-2 text-sm leading-normal">
                                    <label for="note-form-content"> Content </label>

                                    <span class="text-muted text-xs leading-[inherit]">{{ content.length }} characters</span>
                                </div>

                                <textarea class="w-full min-w-0 p-3 text-content bg-input border border-control-border rounded-md text-sm
                                    leading-normal outline-none resize-y min-h-32 focus:border-accent disabled:opacity-60
                                    disabled:cursor-wait"
                                    id="note-form-content"
                                    v-model="content"
                                    placeholder="Start writing your note..."
                                    rows="8"
                                    required
                                    :disabled="isLoading"
                                />
                            </div>
                        </div>

                        <div class="note-modal-footer flex items-center gap-3 justify-between max-phone:flex-wrap">
                            <div class="footer-info flex items-center gap-3 text-muted text-xs leading-[inherit]">
                                <Icon name="solar:document-text-linear" />
                                <span>Plain text note</span>
                            </div>

                            <div class="footer-actions flex items-center gap-3 max-phone:ml-auto">
                                <button
                                    type="button"
                                    class="cancel-btn inline-flex items-center justify-center gap-2 min-h-10 py-2 px-3 border
                                    border-control-border rounded-md text-foreground bg-raised [font-family:inherit] text-sm font-medium
                                    leading-normal cursor-pointer hover:enabled:bg-raised disabled:opacity-60 disabled:cursor-wait
                                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                                    :disabled="isLoading"
                                    @click="closeModal"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    class="save-btn inline-flex items-center justify-center gap-2 min-h-10 py-2 px-3 border rounded-md
                                    text-on-primary bg-primary [font-family:inherit] text-sm font-medium leading-normal cursor-pointer
                                    border-primary hover:enabled:bg-primary/85 disabled:opacity-60 disabled:cursor-wait
                                    focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                                    :disabled="!canSubmit"
                                >
                                    <Icon
                                        :name="
                                            isLoading
                                                ? 'solar:refresh-linear'
                                                : isEditing
                                                  ? 'solar:diskette-linear'
                                                  : 'solar:add-circle-linear'
                                        "
                                    />
                                    {{
                                        isLoading
                                            ? 'Saving...'
                                            : isEditing
                                              ? 'Save changes'
                                              : 'Create note'
                                    }}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { noteSchema } from '~~/shared/schemas/note'

interface NoteData {
    id: string
    title: string
    content: string
}

const props = withDefaults(
    defineProps<{
        open: boolean
        mode?: 'create' | 'edit'
        note?: NoteData | null
    }>(),
    {
        mode: 'create',
        note: null
    }
)

const emit = defineEmits<{
    close: []
    saved: []
}>()

const { isLoading, createNote, updateNote } = useNoteActions()
const { openToast } = useToast()

const title = ref('')
const content = ref('')
const titleInput = ref<HTMLInputElement | null>(null)
const dialog = ref<HTMLElement | null>(null)

const isEditing = computed(() => props.mode === 'edit')

const canSubmit = computed(() => {
    return (
        noteSchema.safeParse({
            title: title.value,
            content: content.value
        }).success && !isLoading.value
    )
})

watch(
    () => [props.open, props.mode, props.note] as const,
    async () => {
        if (!props.open) return

        title.value = isEditing.value ? (props.note?.title ?? '') : ''
        content.value = isEditing.value ? (props.note?.content ?? '') : ''
        await nextTick()
        titleInput.value?.focus()
    },
    { immediate: true }
)

const trapFocus = (event: KeyboardEvent) => {
    const fields = dialog.value?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'
    )

    if (!fields?.length) {
        event.preventDefault()

        return
    }

    const first = fields[0]!
    const last = fields[fields.length - 1]!

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
    }
}

const closeModal = () => {
    if (isLoading.value) return

    emit('close')
}

const saveNote = async () => {
    if (isLoading.value) return

    const result = noteSchema.safeParse({
        title: title.value,
        content: content.value
    })

    if (!result.success) {
        openToast(result.error.issues[0]?.message ?? 'Invalid note.', 'error')

        return
    }

    if (isEditing.value && !props.note?.id) {
        openToast('No note selected.', 'error')

        return
    }

    try {
        if (isEditing.value) {
            await updateNote(props.note!.id, result.data)
        } else {
            await createNote(result.data)
        }

        openToast(
            isEditing.value ? 'Note updated successfully.' : 'Note created successfully.',
            'success'
        )

        emit('saved')
        closeModal()
    } catch (err: any) {
        openToast(err?.data?.message || err?.message || 'Failed to save note.', 'error')
    }
}
</script>
