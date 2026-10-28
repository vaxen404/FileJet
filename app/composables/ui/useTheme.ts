import { themeModes, type ThemeMode, type ResolvedTheme } from '~/utils/themes'

export const useTheme = () => {
    const { preferences, preferencesLoaded, savePreferences } = usePreferences()
    const resolvedTheme = useState<ResolvedTheme>('resolved-theme', () => 'dark')
    const systemTheme = useState<ResolvedTheme>('system-theme', () => 'dark')
    const { openToast } = useToast()

    const setTheme = (theme: ThemeMode) => {
        if (!preferencesLoaded.value || !themeModes.some(mode => mode.value === theme)) return
        try {
            savePreferences({ ...preferences.value, theme })
        } catch {
            openToast('Could not save the theme. Check your browser storage settings.', 'error')
        }
    }

    return { theme: computed(() => preferences.value.theme), resolvedTheme, systemTheme, setTheme }
}
