export default defineEventHandler((event) => {
    try {
        clearAuthSession(event)

        return {
            success: true
        }
    } catch {
        throw createError({
            statusCode: 500,
            message: 'Çıkış yapılırken bir hata oluştu.'
        })
    }
})
