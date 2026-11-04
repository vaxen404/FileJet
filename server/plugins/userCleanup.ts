import { cleanupDeletedUsers } from '../utils/userDeletion'

export default defineNitroPlugin(nitro => {
    let running = false
    const clean = async () => {
        if (running) return
        running = true
        try { await cleanupDeletedUsers() }
        catch (error) { console.error('[USER CLEANUP]', error) }
        finally { running = false }
    }
    const timer = setInterval(clean, 15 * 60 * 1000)
    timer.unref()
    void clean()
    nitro.hooks.hook('close', () => clearInterval(timer))
})
