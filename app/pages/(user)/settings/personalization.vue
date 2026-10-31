<template>
    <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-300 p-6 max-mobile:p-3">
            <header class="mb-6">
                <h2 class="text-lg font-semibold tracking-tight text-foreground">Appearance</h2>
                <p class="mt-1 text-sm leading-6 text-muted">Make your workspace feel like yours.</p>
            </header>

            <form class="overflow-hidden rounded-xl border border-divider bg-surface" @submit.prevent="save">
                <fieldset :disabled="!preferencesLoaded" class="min-w-0 disabled:opacity-60">
                    <div class="grid grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.4fr)] max-laptop:grid-cols-1">
                        <section aria-labelledby="color-heading" class="min-w-0 p-6 max-mobile:p-4">
                            <ThemePicker v-model="themeMode" class="mb-6 border-b border-divider pb-6" />

                            <h3 id="color-heading" class="text-sm font-semibold text-foreground">Accent color</h3>
                            <p class="mt-1 text-xs leading-5 text-muted">Saved for your account in this browser.</p>

                            <fieldset class="mt-6">
                                <legend class="sr-only">Choose an accent color</legend>
                                <div class="grid grid-cols-3 gap-3 max-tiny:grid-cols-2">
                                    <label v-for="color in accentColors" :key="color.value" class="cursor-pointer">
                                        <input v-model="accentColor" type="radio" name="personalization-accent" :value="color.value" class="peer sr-only">
                                        <span
                                            class="flex min-h-24 flex-col items-center justify-center gap-3 rounded-lg border border-control-border
                                                bg-control transition-colors hover:border-muted peer-focus-visible:outline-2
                                                peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent
                                                peer-disabled:cursor-not-allowed"
                                            :style="accentColor === color.value ? { borderColor: color.accent, backgroundColor: `${color.primary}1a` } : undefined"
                                        >
                                            <span class="flex size-8 items-center justify-center rounded-full border border-white/10" :style="{ backgroundColor: color.primary }">
                                                <Icon v-if="accentColor === color.value" name="solar:check-read-linear" size="18" class="text-on-primary" />
                                            </span>
                                            <span class="text-xs font-medium" :class="accentColor === color.value ? 'text-foreground' : 'text-label'">{{ color.label }}</span>
                                        </span>
                                    </label>
                                </div>
                            </fieldset>

                            <button type="button" :disabled="accentColor === 'indigo'" class="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg py-2 text-xs text-label
                                hover:enabled:text-foreground focus-visible:outline-2 focus-visible:outline-offset-3
                                focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40" @click="accentColor = 'indigo'">
                                <Icon name="solar:restart-linear" size="15" />
                                Restore default
                            </button>
                        </section>

                        <section
                            aria-labelledby="preview-heading"
                            class="min-w-0 border-l border-divider bg-control/30 p-6 max-laptop:border-t max-laptop:border-l-0
                                max-mobile:p-4"
                        >
                            <div class="mb-5 flex items-center justify-between gap-3">
                                <h3 id="preview-heading" class="text-sm font-semibold text-foreground">Preview</h3>
                                <span class="inline-flex items-center gap-2 text-xs text-muted" aria-live="polite">
                                    <span class="size-2 rounded-full" :style="{ backgroundColor: selectedColor.accent }" />
                                    {{ selectedColor.label }}
                                </span>
                            </div>

                            <div :style="previewStyle" class="overflow-hidden rounded-lg border border-divider bg-canvas" aria-label="File browser color preview">
                                <div class="flex h-11 items-center justify-between border-b border-divider bg-surface px-4">
                                    <span class="flex items-center gap-2 text-xs font-semibold text-foreground">
                                        <Icon name="solar:folder-with-files-bold-duotone" size="19" class="text-accent" />
                                        FileJet
                                    </span>
                                    <span class="flex size-6 items-center justify-center rounded-full bg-primary text-[9px] font-semibold
                                        text-on-primary">VX</span>
                                </div>

                                <div class="flex min-h-64">
                                    <div class="w-28 shrink-0 space-y-1 border-r border-divider bg-surface px-2 py-4 max-phone:hidden" aria-hidden="true">
                                        <div
                                            v-for="item in previewNavigation"
                                            :key="item.label"
                                            class="flex items-center gap-2 rounded-md px-2 py-2 text-[10px]"
                                            :class="item.label === 'Files' ? 'bg-primary font-medium text-on-primary' : 'text-label'"
                                        >
                                            <Icon :name="item.icon" size="14" />
                                            {{ item.label }}
                                        </div>
                                    </div>

                                    <div class="min-w-0 flex-1 p-4">
                                        <div class="mb-4 flex items-center justify-between gap-2">
                                            <span class="text-xs font-semibold text-foreground">Files</span>
                                            <span class="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-medium
                                                text-on-primary">
                                                <Icon name="solar:add-circle-linear" size="12" />
                                                Upload
                                            </span>
                                        </div>

                                        <div class="overflow-hidden rounded-md border border-divider">
                                            <div
                                                v-for="(item, index) in previewItems"
                                                :key="item.name"
                                                class="flex items-center gap-2.5 border-b border-divider px-3 py-3 last:border-b-0"
                                                :class="index === 1 ? 'bg-accent/8' : 'bg-surface'"
                                            >
                                                <span
                                                    class="flex size-3.5 shrink-0 items-center justify-center rounded-sm border"
                                                    :class="index === 1 ? 'border-primary bg-primary text-on-primary' : 'border-control-border bg-control'"
                                                    aria-hidden="true"
                                                >
                                                    <Icon v-if="index === 1" name="solar:check-read-linear" size="11" />
                                                </span>
                                                <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent">
                                                    <Icon :name="item.icon" size="18" />
                                                </span>
                                                <div class="min-w-0 flex-1">
                                                    <p class="truncate text-[11px] font-medium text-foreground">{{ item.name }}</p>
                                                    <p class="mt-0.5 text-[10px] text-muted">{{ item.type }}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                                            <div class="h-full w-2/5 rounded-full bg-primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p class="mt-3 text-xs leading-5 text-muted">{{ previewTheme === 'light' ? 'Light' : 'Dark' }} preview · {{ selectedColor.label }} accent. Save to apply across FileJet.</p>
                        </section>
                    </div>

                    <footer class="flex flex-wrap items-center justify-between gap-4 border-t border-divider px-6 py-4 max-mobile:px-4">
                        <p class="text-xs text-muted" aria-live="polite">{{ dirty ? 'Unsaved changes' : 'All changes saved' }}</p>
                        <div class="ml-auto flex items-center gap-3">
                            <button type="button" :disabled="!dirty" class="h-10 cursor-pointer border border-control-border bg-control px-4 text-xs text-secondary
                                transition-colors hover:enabled:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2
                                focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40" @click="cancel">Cancel</button>
                            <button type="submit" :disabled="!dirty" class="inline-flex h-10 cursor-pointer items-center gap-2 border border-primary bg-primary px-4 text-xs
                                font-medium text-on-primary transition-[filter] hover:enabled:brightness-110 focus-visible:outline-2
                                focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed
                                disabled:opacity-40">
                                <Icon name="solar:check-read-linear" size="16" />
                                Save changes
                            </button>
                        </div>
                    </footer>
                </fieldset>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { accentColors, getAccentColor, type AccentColor } from '~/utils/appearance'
import { getAppearanceVariables, resolveTheme, type ThemeMode } from '~/utils/themes'

definePageMeta({
    middleware: 'auth',
    layout: 'user'
})

useHead({ title: 'Appearance · FileJet' })

const { preferences, preferencesLoaded, savePreferences } = usePreferences()
const { openToast } = useToast()
const accentColor = ref<AccentColor>(preferences.value.accentColor)
const themeMode = ref<ThemeMode>(preferences.value.theme)
const { systemTheme } = useTheme()
const dirty = computed(() => accentColor.value !== preferences.value.accentColor || themeMode.value !== preferences.value.theme)
const selectedColor = computed(() => getAccentColor(accentColor.value))
const previewTheme = computed(() => resolveTheme(themeMode.value, systemTheme.value))
const previewStyle = computed(() => ({
    ...getAppearanceVariables(previewTheme.value, accentColor.value),
    colorScheme: previewTheme.value
}))

const previewNavigation = [
    { label: 'Home', icon: 'solar:home-2-linear' },
    { label: 'Files', icon: 'solar:document-linear' },
    { label: 'Folders', icon: 'solar:folder-linear' },
    { label: 'Notes', icon: 'solar:notebook-linear' }
]

const previewItems = [
    { name: 'Project files', type: 'Folder', icon: 'solar:folder-bold' },
    { name: 'Meeting notes', type: 'Note', icon: 'solar:notebook-bold' },
    { name: 'Cover.png', type: 'Image', icon: 'solar:gallery-bold' }
]

useUnsavedChanges(dirty, ref(false))
watch(() => preferences.value.accentColor, value => { accentColor.value = value })
watch(() => preferences.value.theme, value => { themeMode.value = value })

const cancel = () => {
    accentColor.value = preferences.value.accentColor
    themeMode.value = preferences.value.theme
}

const save = () => {
    if (!preferencesLoaded.value || !dirty.value) return

    try {
        savePreferences({ ...preferences.value, accentColor: accentColor.value, theme: themeMode.value })
        openToast('Appearance saved.', 'success')
    } catch {
        openToast('Appearance could not be saved. Allow this browser to store site data and try again.', 'error')
    }
}
</script>
