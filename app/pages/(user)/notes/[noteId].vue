<template>
    <DetailsWorkspace
        v-if="note"
        v-model="activeTab"
        :title="note.title"
        :summary="formatFileSize(note.size)"
        :item-id="note.id"
        item-type="note"
        :return-name="returnPage.name"
        :metadata="metadataRows"
        :share="note.share"
        :is-favorite="isFavorite"
        :busy="busy"
        @back="goBack"
        @download="download"
        @favorite="toggleFavorite"
        @rename="focusTitle"
        @delete="remove"
        @share-changed="note.share = $event"
    >
        <article
            v-if="!isEditing"
            class="note-reader"
            aria-label="Note content"
        >
            <div class="reader-heading">
                <h2>{{ note.title }}</h2>
                <span
                    v-if="dirty"
                    class="unsaved-state"
                    role="status"
                >
                    Unsaved changes kept in Edit
                </span>
            </div>

            <div
                v-if="note.content"
                class="note-reading-content"
                v-text="note.content"
            />

            <div
                v-else
                class="note-empty"
            >
                <Icon
                    name="solar:notebook-linear"
                    size="2rem"
                    aria-hidden="true"
                />
                <strong>This note is empty</strong>
                <p>Choose Edit to add content.</p>
            </div>
        </article>

        <form
            v-else
            class="note-editor"
            :aria-busy="isSaving"
            @submit.prevent="save"
        >
            <div class="editor-heading">
                <label for="note-title">Note title</label>
                <span
                    v-if="dirty"
                    class="unsaved-state"
                    role="status"
                >
                    Unsaved changes
                </span>
            </div>
            <input
                id="note-title"
                ref="titleInput"
                v-model="draftTitle"
                maxlength="32"
                required
                :disabled="busy"
            />
            <label for="note-content">Content</label>
            <textarea
                id="note-content"
                v-model="draftContent"
                required
                :disabled="busy"
                spellcheck="true"
            />
            <p
                v-if="saveError"
                class="editor-error"
                role="alert"
            >
                {{ saveError }}
            </p>
            <div class="editor-actions">
                <button
                    type="button"
                    :disabled="busy || !dirty"
                    @click="cancel"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="primary"
                    :disabled="busy || !dirty"
                >
                    {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
            </div>
        </form>
        <template #edit>
            <form
                v-if="isEditing"
                class="note-edit-title"
                @submit.prevent="save"
            >
                <label for="note-edit-title">Note title</label>
                <input
                    id="note-edit-title"
                    v-model="draftTitle"
                    maxlength="32"
                    required
                    :disabled="busy"
                />
                <p>Content can be edited in the editor. Save applies both title and content.</p>
                <p
                    v-if="saveError"
                    class="editor-error"
                    role="alert"
                >
                    {{ saveError }}
                </p>
                <div class="editor-actions">
                    <button
                        type="button"
                        :disabled="busy"
                        @click="cancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="primary"
                        :disabled="busy || !dirty"
                    >
                        {{ isSaving ? 'Saving...' : 'Save' }}
                    </button>
                </div>
            </form>
        </template>
    </DetailsWorkspace>
    <div
        v-else
        class="detail-error"
        role="alert"
    >
        <h1>Unable to load note</h1>
        <p>The note could not be found or accessed.</p>
        <button
            type="button"
            @click="refresh()"
        >
            Try again
        </button>
        <NuxtLink :to="returnPage.path">Back to {{ returnPage.name }}</NuxtLink>
    </div>
</template>

<script setup lang="ts">
import type { NoteDetails } from '~~/shared/types/library'
import { noteSchema } from '~~/shared/schemas/note'
import { formatFileSize, formatFileTime } from '~/utils/file'
import { getFileReturnPage } from '~/utils/fileNavigation'

definePageMeta({ middleware: 'auth', layout: 'user', key: route => route.path })

const route = useRoute()
const router = useRouter()
const id = route.params.noteId as string
const returnPage = computed(
    () => getFileReturnPage(route.query.from) ?? { path: '/notes', name: 'Notes' }
)
const { data: note, refresh } = await useFetch<NoteDetails>(`/api/notes/${encodeURIComponent(id)}`)
const { updateNote, deleteNote, isDeleting } = useNoteActions()
const { addFavorite, removeFavorite } = useFavoriteActions()
const { notes, favorites, fetchFavorites } = useUser()
const { openToast } = useToast()

await fetchFavorites()
const activeTab = ref<'details' | 'edit' | 'share'>(route.query.tab === 'edit' ? 'edit' : 'details')
const isEditing = computed(() => activeTab.value === 'edit')
const draftTitle = ref(note.value?.title ?? '')
const draftContent = ref(note.value?.content ?? '')
const titleInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)
const isFavoriting = ref(false)
const saveError = ref('')
const busy = computed(() => isSaving.value || isDeleting.value || isFavoriting.value)
const dirty = computed(
    () =>
        !!note.value &&
        (draftTitle.value !== note.value.title || draftContent.value !== note.value.content)
)
const isFavorite = computed(() => favorites.value.some(item => item.note_id === id))

useDetailsHeader(
    'note',
    id,
    computed(() => note.value?.title ?? 'Note'),
    returnPage
)
useUnsavedChanges(dirty, isSaving)

watch(note, (value, previous) => {
    if (value && !previous) {
        draftTitle.value = value.title
        draftContent.value = value.content
    }
})

const goBack = () => router.push(returnPage.value.path)

const cancel = () => {
    draftTitle.value = note.value?.title ?? ''
    draftContent.value = note.value?.content ?? ''
    saveError.value = ''
    activeTab.value = 'details'
}

const focusTitle = async () => {
    activeTab.value = 'edit'
    await nextTick()
    titleInput.value?.focus()
    titleInput.value?.select()
}

const save = async () => {
    if (!note.value || !isEditing.value || busy.value || !dirty.value) return
    const parsed = noteSchema.safeParse({ title: draftTitle.value, content: draftContent.value })
    if (!parsed.success) {
        saveError.value = parsed.error.issues[0]?.message ?? 'Invalid note.'
        return
    }

    isSaving.value = true
    saveError.value = ''

    try {
        const response = await updateNote(id, {
            ...parsed.data,
            expectedUpdatedAt: note.value.updated_at
        })
        note.value = { ...note.value, ...response.note }
        draftTitle.value = response.note.title
        draftContent.value = response.note.content
        const listed = notes.value.find(item => item.id === id)
        if (listed) Object.assign(listed, response.note)
        activeTab.value = 'details'
        openToast('Note saved successfully.', 'success')
    } catch (error: any) {
        saveError.value = error.data?.message || error.message || 'Could not save note.'
        openToast(saveError.value, 'error')
    } finally {
        isSaving.value = false
    }
}

const download = () => {
    const link = document.createElement('a')
    link.href = `/api/notes/${encodeURIComponent(id)}/download`
    link.download = ''
    link.click()
}

const toggleFavorite = async () => {
    if (busy.value) return
    isFavoriting.value = true
    try {
        if (isFavorite.value) await removeFavorite(id, 'note')
        else await addFavorite(id, 'note')
        await fetchFavorites()
        openToast('Favorite updated.', 'success')
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not update favorite.', 'error')
    } finally {
        isFavoriting.value = false
    }
}

const remove = async () => {
    if (busy.value) return
    try {
        await deleteNote(id)
        notes.value = notes.value.filter(item => item.id !== id)
        cancel()
        await goBack()
    } catch (error: any) {
        openToast(error.data?.message || error.message || 'Could not delete note.', 'error')
    }
}

const metadataRows = computed(() => {
    const item = note.value
    if (!item) return []
    const sharing = item.share
    return [
        { label: 'Note title', value: item.title },
        { label: 'Size', value: formatFileSize(item.size) },
        { label: 'Character count', value: Array.from(item.content).length },
        {
            label: 'Word count',
            value: item.content.trim() ? item.content.trim().split(/\s+/u).length : 0
        },
        { label: 'Created date', value: item.created_at ? formatFileTime(item.created_at) : null },
        { label: 'Modified date', value: item.updated_at ? formatFileTime(item.updated_at) : null },
        { label: 'Folder', value: item.folder?.name ?? 'None' },
        { label: 'Favorite status', value: isFavorite.value ? 'Favorited' : 'Not favorited' },
        {
            label: 'Share status',
            value: !sharing.url ? 'Not shared' : sharing.isExpired ? 'Expired' : 'Active'
        },
        { label: 'Password protection', value: sharing.hasPassword ? 'Enabled' : 'Disabled' },
        {
            label: 'Link expiration',
            value: sharing.expiresAt ? new Date(sharing.expiresAt).toLocaleString('en-US') : 'Never'
        }
    ]
})
</script>

<style scoped>
.note-reader {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 1rem;
    padding: 1.25rem;
    overflow: auto;
    overscroll-behavior: contain;
    box-sizing: border-box;
    text-align: left;
}

.reader-heading,
.note-reading-content {
    width: 100%;
    min-width: 0;
    margin: 0;
}

.reader-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.reader-heading h2 {
    margin: 0;
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
}

.note-reading-content {
    color: #d5d5da;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.note-empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.625rem;
    color: #898991;
    text-align: left;
}

.note-empty :deep(.iconify) {
    color: #8b7cff;
}

.note-empty strong {
    color: #d5d5da;
    font-size: 0.875rem;
}

.note-empty p {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.6;
}

.note-editor {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    box-sizing: border-box;
}

.editor-heading,
.editor-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.editor-actions {
    justify-content: flex-end;
}

label {
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 500;
}

input,
textarea,
button {
    color: #cfcfd5;
    background: #202024;
    border: 1px solid #303036;
    border-radius: 6px;
    padding: 0.625rem 0.75rem;
    font: inherit;
    box-sizing: border-box;
    min-width: 0;
}

textarea {
    flex: 1;
    min-height: 6rem;
    resize: none;
    line-height: 1.7;
}

input:focus,
textarea:focus {
    outline: none;
    border-color: #5965ed;
}

button {
    cursor: pointer;
}

button:hover:not(:disabled) {
    background: #29292e;
}

button.primary {
    background: #3c47be;
    border-color: #3c47be;
    color: #ffffff;
}

button.primary:hover:not(:disabled) {
    background: #4652d1;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.unsaved-state,
.note-edit-title p {
    color: #898991;
    font-size: 0.8125rem;
}

.editor-error,
.note-edit-title .editor-error {
    color: #ff6b6b;
    margin: 0;
}

.note-edit-title {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.detail-error {
    padding: 1.25rem;
    color: #d5d5da;
}

.detail-error a {
    color: #8b7cff;
    margin-left: 0.75rem;
}

@media (max-width: 500px) {
    .note-reader,
    .note-editor {
        padding: 0.75rem;
    }
}
</style>
