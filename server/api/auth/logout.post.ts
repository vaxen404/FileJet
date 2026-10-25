import { throwError } from '~~/server/utils/error'
export default defineEventHandler(event => {
    try {
        clearAuthSession(event)

        return {
            success: true
        }
    } catch {
        throwError(500, 'An error occurred while logging out.')
    }
})
