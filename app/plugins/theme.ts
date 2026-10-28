import { useMediaQuery } from '@vueuse/core'
import { accentColors, type AccentColor } from '~/utils/appearance'
import { getAppearanceVariables, isThemeMode, resolveTheme, type ThemeMode, type ResolvedTheme } from '~/utils/themes'

interface AppearanceCookie { userId: string; theme: ThemeMode; accentColor: AccentColor; resolvedTheme: ResolvedTheme }

export default defineNuxtPlugin({
    name: 'appearance',
    enforce: 'post',
    setup() {
        const currentUser = useAuthUser()
        const { preferences, preferencesLoaded } = usePreferences()
        const cookie = useCookie<AppearanceCookie | null>('filejet-appearance', { default: () => null, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })
        const saved = cookie.value
        const validSaved = saved && currentUser.value && currentUser.value.id === saved.userId && isThemeMode(saved.theme)
            && accentColors.some(color => color.value === saved.accentColor)

        // Restore appearance during SSR so saved light/dark choices render before hydration.
        if (import.meta.server && validSaved) {
            preferences.value = { ...preferences.value, theme: saved.theme, accentColor: saved.accentColor }
        }

        const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
        const resolvedTheme = useState<ResolvedTheme>('resolved-theme', () => 'dark')
        const systemTheme = useState<ResolvedTheme>('system-theme', () => 'dark')
        const clientReady = ref(false)
        if (import.meta.client) onNuxtReady(() => { clientReady.value = true })

        watchEffect(() => {
            if (import.meta.server) systemTheme.value = validSaved && saved.resolvedTheme === 'light' ? 'light' : 'dark'
            else if (clientReady.value) systemTheme.value = prefersDark.value ? 'dark' : 'light'
            resolvedTheme.value = resolveTheme(preferences.value.theme, systemTheme.value)

            if (import.meta.client && clientReady.value && preferencesLoaded.value && currentUser.value) {
                const next: AppearanceCookie = { userId: currentUser.value.id, theme: preferences.value.theme, accentColor: preferences.value.accentColor, resolvedTheme: resolvedTheme.value }
                if (JSON.stringify(cookie.value) !== JSON.stringify(next)) cookie.value = next
            }
        })

        useHead(() => ({
            htmlAttrs: {
                'data-theme': resolvedTheme.value,
                style: Object.entries(getAppearanceVariables(resolvedTheme.value, preferences.value.accentColor))
                    .map(([name, value]) => `${name}:${value}`).join(';') + `;color-scheme:${resolvedTheme.value}`
            }
        }))
    }
})
