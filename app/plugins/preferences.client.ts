export default defineNuxtPlugin(() => {
    const currentUser = useAuthUser()
    const { loadPreferences } = usePreferences()

    onNuxtReady(() => {
        watch(() => currentUser.value?.id, loadPreferences, { immediate: true })
    })
})
