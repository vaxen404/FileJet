import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

interface NoteContent { title: string; content: string; updated_at: string | null; revision?: number }

export const useNoteAutosave = <T extends NoteContent>(options: {
    note: Ref<T | undefined>
    write: (value: { title: string; content: string; expectedUpdatedAt: string | null; expectedRevision?: number }) => Promise<NoteContent & Partial<T>>
    validate: (value: { title: string; content: string }) => string | null
    saved: (value: T) => void
    blocked?: Ref<boolean>
    delay?: number
}) => {
    const draftTitle = ref(options.note.value?.title ?? '')
    const draftContent = ref(options.note.value?.content ?? '')
    const isSaving = ref(false), saveError = ref(''), lastSaved = ref<Date | null>(null)
    const dirty = computed(() => !!options.note.value && (draftTitle.value !== options.note.value.title || draftContent.value !== options.note.value.content))
    const validationError = computed(() => options.validate({ title: draftTitle.value, content: draftContent.value }))
    const saveStatus = computed(() => isSaving.value ? 'Saving…' : saveError.value ? 'Not saved — retry' : dirty.value ? validationError.value ? 'Enter a title and content to save' : 'Waiting to save…' : 'All changes saved')
    let timer: ReturnType<typeof setTimeout> | null = null
    let pending: Promise<boolean> | null = null
    let disposed = false
    const clear = () => { if (timer) clearTimeout(timer); timer = null }

    const flush = (drain = true): Promise<boolean> => {
        clear()
        if (pending) return drain ? pending.then(() => !dirty.value ? true : saveError.value ? false : flush()) : pending
        if (options.blocked?.value) return Promise.resolve(false)
        if (!dirty.value) return Promise.resolve(true)
        if (validationError.value) return Promise.resolve(false)
        isSaving.value = true
        saveError.value = ''
        pending = (async () => {
            try {
                while (dirty.value && options.note.value && !disposed) {
                    const title = draftTitle.value, content = draftContent.value
                    const error = options.validate({ title, content })
                    if (error) return false
                    const result = await options.write({ title, content, expectedUpdatedAt: options.note.value.updated_at, ...(options.note.value.revision !== undefined ? { expectedRevision: options.note.value.revision } : {}) })
                    options.note.value = { ...options.note.value, ...result }
                    // A response updates the saved baseline, never newer typing.
                    if (draftTitle.value === title) draftTitle.value = result.title
                    if (draftContent.value === content) draftContent.value = result.content
                    options.saved(options.note.value)
                    lastSaved.value = new Date()
                    if (!drain) break
                }
                return !dirty.value
            } catch (error: any) {
                saveError.value = error.data?.message || error.message || 'Could not save note. Your changes are still in the editor.'
                return false
            } finally { isSaving.value = false; pending = null; clear(); if (dirty.value && !saveError.value) schedule() }
        })()
        return pending
    }
    const schedule = () => {
        clear()
        if (!dirty.value || validationError.value || saveError.value || disposed || options.blocked?.value) return
        timer = setTimeout(() => { timer = null; void flush(false) }, options.delay ?? 900)
    }
    watch([draftTitle, draftContent], schedule, { flush: 'sync' })
    if (options.blocked) watch(options.blocked, blocked => { if (blocked) clear(); else schedule() }, { flush: 'sync' })
    watch(options.note, (value, previous) => {
        if (value && !previous) { draftTitle.value = value.title; draftContent.value = value.content }
    })
    const discard = () => {
        if (isSaving.value) return
        clear()
        draftTitle.value = options.note.value?.title ?? ''
        draftContent.value = options.note.value?.content ?? ''
        clear()
        saveError.value = ''
    }
    onScopeDispose(() => { disposed = true; clear() })
    return { draftTitle, draftContent, dirty, isSaving, saveError, lastSaved, saveStatus, flush, discard }
}
