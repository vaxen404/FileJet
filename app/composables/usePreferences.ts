import { accentColors, type AccentColor } from '~/utils/appearance'
import type { ThemeMode } from '~/utils/themes'

export type FileJetPreferences = {
    defaultView: 'grid' | 'list'
    defaultSort: 'newest' | 'oldest' | 'name-asc' | 'name-desc'
    pageSize: 'auto' | number
    accentColor: AccentColor
    theme: ThemeMode
}

export const isValidPageSize = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0

const getDefaultPreferences = (): FileJetPreferences => ({
    defaultView: 'grid',
    defaultSort: 'newest',
    pageSize: 'auto',
    accentColor: 'indigo',
    theme: 'dark'
})

const normalizePreferences = (value: unknown): FileJetPreferences => {
    const defaults = getDefaultPreferences()

    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults

    const stored = value as Partial<FileJetPreferences>

    return {
        defaultView: stored.defaultView === 'list' ? 'list' : defaults.defaultView,
        defaultSort: stored.defaultSort === 'oldest' || stored.defaultSort === 'name-asc' || stored.defaultSort === 'name-desc'
            ? stored.defaultSort
            : defaults.defaultSort,
        pageSize: isValidPageSize(stored.pageSize)
            ? stored.pageSize
            : defaults.pageSize,
        accentColor: accentColors.find(color => color.value === stored.accentColor)?.value ?? defaults.accentColor,
        theme: stored.theme === 'light' || stored.theme === 'system' ? stored.theme : defaults.theme
    }
}

export const usePreferences = () => {
    const currentUser = useAuthUser()
    const preferences = useState<FileJetPreferences>('filejet-preferences', getDefaultPreferences)
    const preferencesLoaded = useState<boolean>('filejet-preferences-loaded', () => false)

    const loadPreferences = () => {
        if (!import.meta.client) return

        preferencesLoaded.value = false
        preferences.value = getDefaultPreferences()

        try {
            if (currentUser.value) {
                const stored = localStorage.getItem(`filejet:preferences:${currentUser.value.id}`)

                if (stored) preferences.value = normalizePreferences(JSON.parse(stored))
            }
        } catch {
            preferences.value = getDefaultPreferences()
        } finally {
            preferencesLoaded.value = true
        }
    }

    const savePreferences = (value: FileJetPreferences) => {
        if (!import.meta.client || !currentUser.value) {
            throw new Error('Please sign in to save your preferences.')
        }

        const updated = normalizePreferences(value)

        localStorage.setItem(`filejet:preferences:${currentUser.value.id}`, JSON.stringify(updated))
        preferences.value = updated
    }

    return { preferences, preferencesLoaded, loadPreferences, savePreferences, getDefaultPreferences }
}
