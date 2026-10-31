import { cleanupExpiredUploads } from '../utils/resumableUpload'
export default defineNitroPlugin(nitro => {
    let running = false
    const clean = async () => {
        if (running) return
        running = true
        try { await cleanupExpiredUploads() } catch (error) { console.error('[EXPIRED UPLOAD CLEANUP]', error) }
        finally { running = false }
    }
    const timer = setInterval(clean, 15 * 60 * 1000)
    timer.unref()
    void clean()
    nitro.hooks.hook('close', () => clearInterval(timer))
})
