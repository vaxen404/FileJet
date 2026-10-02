    export default defineNuxtPlugin(async () => {
        const currentUser = useAuthUser()
        const requestFetch = useRequestFetch()
        const authLoaded = useAuthLoaded()

        try {
            const user = await requestFetch('/api/users/@me')
            currentUser.value = user
        } catch {
            currentUser.value = null
        } finally {
            authLoaded.value = true
        }
    })