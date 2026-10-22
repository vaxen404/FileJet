<template>
    <Teleport to="body">
        <Transition name="note-modal">
            <div
                v-if="open"
                class="note-overlay"
                @click.self="closeModal"
            >
                <div
                    ref="dialog"
                    class="note-modal-conteiner"
                    @keydown.esc="closeModal"
                    @keydown.tab="trapFocus"
                >
                    <div class="note-modal-header">
                        <div class="header-left">
                            <div class="note-icon">
                                <Icon name="solar:notes-bold-duotone" />
                            </div>

                            <div class="header-text">
                                <h2 id="note-modal-title">
                                    {{ isEditing ? 'Edit note' : 'Create a note' }}
                                </h2>

                                <p>
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
                            class="clouse-button"
                            :disabled="isLoading"
                            @click="closeModal"
                        >
                            <Icon name="solar:close-circle-linear" />
                        </button>
                    </div>

                    <form @submit.prevent="saveNote">
                        <div class="note-modal-body">
                            <div class="form-field">
                                <div class="fielad-header">
                                    <label for="note-form-title"> Title </label>

                                    <span>{{ title.length }} / 32</span>
                                </div>

                                <input
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

                            <div class="form-field">
                                <div class="field-header">
                                    <label for="note-form-content"> Content </label>

                                    <span>{{ content.length }} characters</span>
                                </div>

                                <textarea
                                    id="note-form-content"
                                    v-model="content"
                                    placeholder="Start writing your note..."
                                    rows="8"
                                    required
                                    :disabled="isLoading"
                                />
                            </div>
                        </div>

                        <div class="note-modal-footer">
                            <div class="footer-info">
                                <Icon name="solar:document-text-linear" />
                                <span>Plain text note</span>
                            </div>

                            <div class="footer-actions">
                                <button
                                    type="button"
                                    class="cancel-btn"
                                    :disabled="isLoading"
                                    @click="closeModal"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    class="save-btn"
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

<style scoped>
.note-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.65);
    box-sizing: border-box;
}

.note-modal-conteiner {
    width: 100%;
    max-width: 36rem;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 12px;
    padding: 1.5rem;
    box-sizing: border-box;
    color: #d5d5da;
}

.note-modal-header,
.header-left,
.note-modal-footer,
.footer-info,
.footer-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.note-modal-header,
.note-modal-footer {
    justify-content: space-between;
}

.header-text {
    min-width: 0;
}

.header-text h2 {
    margin: 0;
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
}

.header-text p {
    margin: 0.25rem 0 0;
    color: #898991;
    font-size: 0.875rem;
    line-height: 1.5;
}

.note-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    color: #8b7cff;
    background: #29215c;
    border-radius: 6px;
}

.clouse-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    padding: 0;
    color: #a8a8b0;
    border: 1px solid #303036;
    background: #242429;
    border-radius: 6px;
    cursor: pointer;
}

.note-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem 0;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.fielad-header,
.field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.5;
}

.fielad-header span,
.field-header span,
.footer-info {
    color: #898991;
    font-size: 0.75rem;
}

.form-field input,
.form-field textarea {
    width: 100%;
    min-width: 0;
    padding: 0.75rem;
    color: #d5d5da;
    background: #151518;
    border: 1px solid #303036;
    border-radius: 6px;
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    box-sizing: border-box;
    outline: none;
}

.form-field textarea {
    resize: vertical;
    min-height: 8rem;
}

.form-field input:focus,
.form-field textarea:focus {
    border-color: #5965ed;
}

.cancel-btn,
.save-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #303036;
    border-radius: 6px;
    color: #ffffff;
    background: #242429;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
}

.save-btn {
    background: #3c47be;
    border-color: #3c47be;
}

.save-btn:hover:not(:disabled) {
    background: #4652d1;
}

.cancel-btn:hover:not(:disabled),
.clouse-button:hover:not(:disabled) {
    background: #2a2a2f;
}

button:disabled,
input:disabled,
textarea:disabled {
    opacity: 0.6;
    cursor: wait;
}

button:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: 2px;
}

@media (max-width: 500px) {
    .note-modal-conteiner {
        padding: 1rem;
    }

    .note-modal-footer {
        flex-wrap: wrap;
    }

    .footer-actions {
        margin-left: auto;
    }
}
</style>
