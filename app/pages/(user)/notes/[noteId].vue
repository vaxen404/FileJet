<template>
    <DetailsWorkspace
        v-if="note"
        v-model="activeTab"
        :title="note.title"
        :summary="formatFileSize(note.size)"
        :item-id="note.id"
        :tags="note.tags"
        @tags-changed="note.tags = $event"
        item-type="note"
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
            class="note-reader flex-1 min-w-0 min-h-0 flex flex-col justify-start gap-4 p-5 overflow-auto
                overscroll-contain text-left max-phone:p-3"
        >
            <div class="reader-heading w-full min-w-0 m-0 flex items-baseline justify-between flex-wrap gap-2">
                <h2 class="m-0 text-foreground text-xl font-semibold leading-[1.4] wrap-anywhere">{{ note.title }}</h2>
                <span
                    v-if="dirty"
                    class="unsaved-state text-muted text-[0.8125rem]"
                >
                    Unsaved changes kept in Edit
                </span>
            </div>

            <MarkdownContent
                v-if="note.content"
                class="note-reading-content w-full min-w-0 m-0"
                :content="note.content"
            />

            <div
                v-else
                class="note-empty flex flex-col items-start gap-2.5 text-muted text-left"
            >
                <Icon class="text-accent"
                    name="solar:notebook-linear"
                    size="2rem"
                />
                <strong class="text-content text-sm leading-[inherit]">This note is empty</strong>
                <p class="m-0 text-[0.8125rem] leading-[1.6]">Choose Edit to add content.</p>
            </div>
        </article>

        <form
            v-else
            class="note-editor flex-1 min-w-0 min-h-0 flex flex-col gap-3 p-5 max-phone:p-3"
            @submit.prevent="save"
        >
            <div class="editor-heading flex items-center justify-between gap-3 flex-wrap">
                <label class="text-foreground text-sm leading-[inherit] font-medium" for="note-title">Note title</label>
                <span
                    class="autosave-status text-muted text-[0.8125rem]" role="status" aria-live="polite"
                >
                    {{ saveStatus }}
                </span>
            </div>
            <input class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0
                focus:outline-none focus:border-accent"
                id="note-title"
                ref="titleInput"
                v-model="draftTitle"
                maxlength="32"
                required
                :disabled="isDeleting"
            />
            <MarkdownEditor class="flex-1 overflow-auto"
                id="note-content"
                v-model="draftContent"
                :disabled="isDeleting"
            />
            <p
                v-if="saveError"
                class="editor-error text-danger m-0"
            >
                {{ saveError }} <button type="button" class="ml-2 underline cursor-pointer" :disabled="isSaving" @click="flush()">Retry save</button>
            </p>
            <div class="editor-actions flex items-center justify-end gap-3 flex-wrap">
                <button class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                    hover:enabled:bg-divider disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                    :disabled="busy"
                    @click="cancel"
                >
                    {{ dirty ? 'Discard unsaved' : 'Done' }}
                </button>
                <button
                    type="submit"
                    class="primary text-on-primary bg-primary border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                        border-primary hover:enabled:bg-primary/85 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="busy || !dirty"
                >
                    {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
            </div>
        </form>
        <template #edit>
            <form
                v-if="isEditing"
                class="note-edit-title flex flex-col gap-3"
                @submit.prevent="save"
            >
                <label class="text-foreground text-sm leading-[inherit] font-medium" for="note-edit-title">Note title</label>
                <input class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0
                    focus:outline-none focus:border-accent"
                    id="note-edit-title"
                    v-model="draftTitle"
                    maxlength="32"
                    required
                    :disabled="isDeleting"
                />
                <p class="text-muted text-[0.8125rem]" role="status" aria-live="polite">{{ saveStatus }} · Changes save automatically.</p>
                <p
                    v-if="saveError"
                    class="editor-error text-danger text-[0.8125rem] m-0"
                >
                    {{ saveError }}
                </p>
                <div class="editor-actions flex items-center justify-end gap-3 flex-wrap">
                    <button class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                        hover:enabled:bg-divider disabled:opacity-60 disabled:cursor-not-allowed"
                        type="button"
                        :disabled="isDeleting"
                        @click="cancel"
                    >
                        {{ dirty ? 'Discard unsaved' : 'Done' }}
                    </button>
                    <button
                        type="submit"
                        class="primary text-on-primary bg-primary border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
                            border-primary hover:enabled:bg-primary/85 disabled:opacity-60 disabled:cursor-not-allowed"
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
        class="detail-error p-5 text-content"
    >
        <h1>Unable to load note</h1>
        <p>The note could not be found or accessed.</p>
        <button class="text-content bg-control border border-control-border rounded-md py-2.5 px-3 min-w-0 cursor-pointer
            hover:enabled:bg-divider disabled:opacity-60 disabled:cursor-not-allowed"
            type="button"
            @click="refresh()"
        >
            Try again
        </button>
        <NuxtLink class="text-accent ml-3" :to="returnPage.path">Back to {{ returnPage.name }}</NuxtLink>
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
const titleInput = ref<HTMLInputElement | null>(null)
const isFavoriting = ref(false)
const busy = computed(() => isSaving.value || isDeleting.value || isFavoriting.value)

const { draftTitle, draftContent, dirty, isSaving, saveError, saveStatus, flush, discard } = useNoteAutosave({
    note,
    blocked: isDeleting,
    write: async value => (await updateNote(id, value)).note,
    validate: value => {
        const result = noteSchema.safeParse(value)
        return result.success ? null : result.error.issues[0]?.message ?? 'Invalid note.'
    },
    saved: value => {
        const listed = notes.value.find(item => item.id === id)
        if (listed) Object.assign(listed, value)
    }
})

const isFavorite = computed(() => favorites.value.some(item => item.note_id === id))

useDetailsHeader(
    'note',
    id,
    computed(() => note.value?.title ?? 'Note'),
    returnPage
)
useUnsavedChanges(dirty, isSaving, flush)

const goBack = () => router.push(returnPage.value.path)

const cancel = () => {
    if (isSaving.value) return
    discard()
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
    if (await flush()) {
        activeTab.value = 'details'
        openToast('Note saved successfully.', 'success')
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
