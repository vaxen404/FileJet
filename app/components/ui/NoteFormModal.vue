<template>
    <Teleport to="body">
        <Transition name="note-modal">
            <div
                v-if="open"
                class="note-overlay"
                @click.self="closeModal"
            >
                <div 
                    class="note-modal-conteiner"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="note-modal-title"
                    @keydown.esc="closeModal"
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
                                    {{ isEditing ? 'Make changes to your note.' : 'Capture your idead and thoughts' }}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="clouse-button"
                            aria-label="Close"
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
                                    <label class="note-form-title">
                                        Title
                                    </label>
                                    
                                    <span>{{ title.length }} / 32</span>
                                </div>
                                
                                <input
                                    id="note-form-title"
                                    v-model="title" 
                                    type="text"
                                    maxlength="32"
                                    placeholder="Enter your title..."
                                    autocomplete="off"
                                    required
                                    />
                                </div>
                            
                                <div class="form-field">
                                    <div class="field-header">
                                        <label for="note-form-content">
                                            Content
                                        </label>
                                        
                                        <span>{{ content.length }} characters</span>
                                    </div>
                                    
                                    <textarea 
                                        id="note-form-content"
                                        v-model="content"
                                        placeholder="Start writing your note..."
                                        rows="8"
                                        required
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
                                            :name="isLoading
                                                ? 'svg-spinners:180-ring'
                                                : isEditing
                                                    ? 'solar:diskette-linear'
                                                    : 'solar:add-circle-linear'"
                                        />
                                        {{ isLoading ? 'Saving...' : isEditing ? 'Save changes' : 'Create note' }}
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
    id: string,
    title: string,
    content: string 
}

const props = withDefaults(defineProps<{
    open: boolean
    mode?: 'create' | 'edit'
    note?: NoteData | null
}>(), {
    mode: 'create',
    note: null
})

const emit = defineEmits<{
    close: []
    saved: []
}>()

const { isLoading, createNote, updateNote } = useNoteActions()
const { openToast } = useToast()


const title = ref('')
const content = ref('')

const isEditing = computed(() => props.mode === 'edit')

const canSubmit = computed(() => {
    return noteSchema.safeParse({
        title: title.value,
        content: content.value
    }).success && !isLoading.value
})

watch(
    () => [props.open, props.mode, props.note] as const,
    () => {
        if (!props.open) return

        title.value = isEditing.value ? props.note?.title ?? '' : ''
        content.value = isEditing.value ? props.note?.content ?? '' : ''
    },
    { immediate: true }
)

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
            isEditing.value
                ? 'Note updated successfully.'
                : 'Note created successfully.',
            'success'
        )

        emit('saved')
        closeModal()
    } catch (err: any) {
        openToast(
            err?.data?.message || err?.message || 'Failed to save note.',
            'error'
        )
    }
}
</script>