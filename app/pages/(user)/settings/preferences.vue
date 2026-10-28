<template>
    <div class="preferences-page min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-300 p-6 max-mobile:p-3">
            <AccountSettings @state-change="accountState = $event" />

            <form @submit.prevent="save">
                <fieldset :disabled="!preferencesLoaded" class="min-w-0 space-y-5">
                    <AccentColorPicker v-model="draft.accentColor" />

                    <section aria-labelledby="browser-heading" class="rounded-xl border border-divider bg-surface">
                        <h2 id="browser-heading" class="border-b border-divider px-5 py-4 text-sm font-semibold text-foreground">File browser</h2>
                        <div class="px-5">
                            <div class="settings-row">
                                <label id="default-view-label" class="text-sm text-secondary">Default view</label>
                                <ViewSwitcher v-model="draft.defaultView" aria-labelledby="default-view-label" />
                            </div>
                            <div class="settings-row">
                                <label for="default-sort" class="text-sm text-secondary">Sort order</label>
                                <select id="default-sort" v-model="draft.defaultSort" class="settings-select">
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                    <option value="name-asc">Name A-Z</option>
                                    <option value="name-desc">Name Z-A</option>
                                </select>
                            </div>
                            <div class="settings-row border-b-0!">
                                <div>
                                    <label for="page-size-mode" class="text-sm text-secondary">Items per page</label>
                                    <p v-if="draft.pageSize === 'auto'" class="mt-1 text-xs text-muted">12 in list view, 24 in grid view.</p>
                                </div>
                                <div>
                                    <div class="flex flex-wrap gap-2">
                                        <select id="page-size-mode" v-model="pageSizeMode" class="settings-select">
                                            <option value="auto">Automatic</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                        <input
                                            v-if="pageSizeMode === 'custom'"
                                            v-model.number="draft.pageSize"
                                            type="number"
                                            min="1"
                                            :max="Number.MAX_SAFE_INTEGER"
                                            step="1"
                                            required
                                            aria-label="Custom items per page"
                                            :aria-invalid="!pageSizeValid"
                                            :aria-describedby="!pageSizeValid ? 'page-size-error' : undefined"
                                            class="h-10 w-28 rounded-control border border-control-border bg-control px-3 text-sm text-secondary outline-none focus:border-accent"
                                        >
                                    </div>
                                    <p v-if="!pageSizeValid" id="page-size-error" role="alert" class="mt-2 text-xs text-danger">Enter a positive whole number.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer class="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" class="h-10 cursor-pointer text-xs text-label hover:text-foreground" @click="reset">Reset preferences</button>
                        <div class="flex flex-wrap items-center gap-3">
                            <span v-if="dirty" class="text-xs text-muted" aria-live="polite">Unsaved changes</span>
                            <button type="button" :disabled="!dirty" class="settings-button border-control-border bg-control text-secondary hover:enabled:bg-raised" @click="cancel">Cancel</button>
                            <button type="submit" :disabled="!dirty || !pageSizeValid" class="settings-button border-primary bg-primary text-on-primary hover:enabled:brightness-110">Save preferences</button>
                        </div>
                    </footer>
                </fieldset>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { isValidPageSize, type FileJetPreferences } from '~/composables/usePreferences'

definePageMeta({ middleware: 'auth', layout: 'user' })
useHead({ title: 'Preferences · FileJet' })

const { openToast } = useToast()
const { preferences, preferencesLoaded, savePreferences, getDefaultPreferences } = usePreferences()
const draft = ref<Omit<FileJetPreferences, 'pageSize'> & { pageSize: 'auto' | number | '' }>({ ...preferences.value })
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(preferences.value))
const accountState = ref({ dirty: false, saving: false })
const pageSizeValid = computed(() => draft.value.pageSize === 'auto' || isValidPageSize(draft.value.pageSize))
const pageSizeMode = computed({
    get: () => draft.value.pageSize === 'auto' ? 'auto' : 'custom',
    set: (value: 'auto' | 'custom') => {
        draft.value.pageSize = value === 'auto' ? 'auto' : preferences.value.pageSize === 'auto' ? 24 : preferences.value.pageSize
    }
})

useUnsavedChanges(computed(() => dirty.value || accountState.value.dirty), computed(() => accountState.value.saving))
watch(preferences, value => { draft.value = { ...value } })

const cancel = () => { draft.value = { ...preferences.value } }
const reset = () => { draft.value = getDefaultPreferences() }

const save = () => {
    if (!preferencesLoaded.value || !dirty.value) return

    const pageSize = draft.value.pageSize

    if (pageSize !== 'auto' && !isValidPageSize(pageSize)) {
        openToast('Enter a positive whole number for items per page.', 'error')
        return
    }

    try {
        savePreferences({ ...draft.value, pageSize })
        openToast('Preferences saved.', 'success')
    } catch {
        openToast('Could not save preferences. Check your browser storage settings.', 'error')
    }
}
</script>

<style scoped>
@reference "../../../assets/css/tailwind.css";

.settings-row {
    @apply flex flex-wrap items-center justify-between gap-3 border-b border-divider py-4;
}
.settings-select {
    @apply h-10 w-52 cursor-pointer rounded-control border border-control-border bg-control px-3 text-sm text-secondary outline-none focus:border-accent;
}
.settings-button {
    @apply h-10 cursor-pointer rounded-control border px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent;
}
</style>
