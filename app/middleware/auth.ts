export default defineNuxtRouteMiddleware(async () => {
    const currentUser = useAuthUser()
    const authLoaded = useAuthLoaded()

    while (!authLoaded.value) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!currentUser.value) {
        return navigateTo('/login')
    }
})