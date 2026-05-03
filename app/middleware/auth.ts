export default defineNuxtRouteMiddleware((to) => {
    const authCookie = useCookie('auth_token')

    if (!authCookie.value && to.path !== '/') {
        return navigateTo('/')
    }

    if (authCookie.value && to.path === '/') {
        return navigateTo('/home')
    }
})