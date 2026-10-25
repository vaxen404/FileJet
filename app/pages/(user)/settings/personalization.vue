<template>
    <div class="min-h-0 flex-1 overflow-y-auto [color-scheme:dark]">
        <div class="mx-auto w-full max-w-300 p-6 max-mobile:p-3">
            <form @submit.prevent="save">
                <fieldset :disabled="!preferencesLoaded">
                    <AccentColorPicker v-model="accentColor" />
                    <div class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-5">
                        <button type="button" class="inline-flex h-10 cursor-pointer items-center gap-2 text-xs text-label hover:text-foreground" @click="accentColor = 'indigo'">
                            <Icon name="solar:restart-linear" size="17" />
                            Restore default color
                        </button>
                        <div class="flex items-center gap-3">
                            <button type="button" :disabled="!dirty" class="h-10 cursor-pointer border border-control-border bg-control px-4 text-xs text-secondary disabled:cursor-not-allowed disabled:opacity-40" @click="accentColor = preferences.accentColor">Cancel</button>
                            <button type="submit" :disabled="!dirty" class="inline-flex h-10 cursor-pointer items-center gap-2 border border-primary bg-primary px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                                <Icon name="solar:check-read-linear" size="16" />
                                Save color
                            </button>
                        </div>
                    </div>
                </fieldset>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { AccentColor } from '~/utils/appearance'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

useHead({ title: 'Personalization · FileJet' })

const { preferences, preferencesLoaded, savePreferences } = usePreferences()
const { openToast } = useToast()
const accentColor = ref<AccentColor>(preferences.value.accentColor)
const dirty = computed(() => accentColor.value !== preferences.value.accentColor)

useUnsavedChanges(dirty, ref(false))
watch(() => preferences.value.accentColor, value => { accentColor.value = value })

const save = () => {
    if (!preferencesLoaded.value || !dirty.value) return

    try {
        savePreferences({ ...preferences.value, accentColor: accentColor.value })
        openToast('Color saved.', 'success')
    } catch {
        openToast('The color could not be saved. Allow this browser to store site data and try again.', 'error')
    }
}
</script>
