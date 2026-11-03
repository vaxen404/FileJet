import { getResponseStatus } from 'h3'
import { captureActivity, finishActivity } from '../utils/activity'
export default defineNitroPlugin(nitro => {
    nitro.hooks.hook('request', async event => {
        try { event.context.activityCapture = await captureActivity(event) }
        catch (error: any) { if (!(error?.statusCode >= 400 && error.statusCode < 500)) console.error('[ACTIVITY CAPTURE]', error) }
    })
    nitro.hooks.hook('beforeResponse', async (event, response) => {
        const capture = event.context.activityCapture
        event.context.activityCapture = null
        if (!capture || getResponseStatus(event) < 200 || getResponseStatus(event) >= 300 || response.body instanceof Error) return
        try { await finishActivity(capture, response.body, event.context.activityShareTarget) }
        catch (error) { console.error('[ACTIVITY WRITE]', error) }
    })
})
