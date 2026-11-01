export default defineNuxtRouteMiddleware(async () => {
    try {
        await useRequestFetch()('/api/admin')
    } catch (error: any) {
        if (error?.statusCode === 401 || error?.status === 401) return navigateTo('/login')
        throw createError({ statusCode: error?.statusCode ?? error?.status ?? 403, statusMessage: 'Administrator access required.' })
    }
})
