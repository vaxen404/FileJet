import { getAccentColor } from '~/utils/appearance'

export default defineNuxtPlugin(() => {
    const currentUser = useAuthUser()
    const { preferences, loadPreferences } = usePreferences()

    watch(() => preferences.value.accentColor, value => {
        const color = getAccentColor(value)

        document.documentElement.style.setProperty('--color-primary', color.primary)
        document.documentElement.style.setProperty('--color-accent', color.accent)
        document.documentElement.style.setProperty('--color-highlight', color.highlight)
    }, { immediate: true })

    onNuxtReady(() => {
        watch(() => currentUser.value?.id, loadPreferences, { immediate: true })
    })
})
