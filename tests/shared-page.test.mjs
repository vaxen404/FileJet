import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { ref, computed, watch } from 'vue'
import ts from 'typescript'

const source = readFileSync(new URL('../app/pages/shared/[token].vue', import.meta.url), 'utf8')
const descriptor = parse(source).descriptor
const script = ts.createSourceFile('shared-page.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest)
const stripped = ts.factory.updateSourceFile(script, script.statements.filter(node => !ts.isImportDeclaration(node)))
const code = ts.transpileModule(ts.createPrinter().printFile(stripped).replaceAll('import.meta.client', 'false'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
}).outputText
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

async function setup(options = {}) {
    const error = ref({ statusCode: 401, data: { data: { passwordRequired: true, fileName: 'Private.mp4' } } })
    const data = ref(null)
    const requests = []
    let refreshes = 0
    const env = {
        ref, computed, watch,
        useRoute: () => ({ params: { token: 'share-token' } }),
        useEventListener: () => {},
        useFullscreen: () => ({ isSupported: ref(false), isFullscreen: ref(false), toggle: async () => {} }),
        useFetch: async () => ({ data, error, refresh: async () => {
            refreshes++
            if (options.expired) { error.value = { statusCode: 410 }; return }
            error.value = null
            data.value = { type: 'file', item: { name: 'Private', original_name: 'Private.mp4', mime_type: 'video/mp4' } }
        } }),
        $fetch: async (url, request) => {
            requests.push({ url, request })
            return options.fetch ? options.fetch(url, request) : { success: true }
        }
    }
    const run = new AsyncFunction(...Object.keys(env), `${code};return { passwordRequired,lockedFileName,sharePassword,showPassword,unlocking,unlockError,unlockShare,isVideo,itemName }`)
    return { page: await run(...Object.values(env)), error, data, requests, refreshes: () => refreshes }
}

test('a locked share shows its filename and no preview; the form supports Enter and an accessible show/hide button', async () => {
    const { page, requests } = await setup()
    assert.equal(page.passwordRequired.value, true)
    assert.equal(page.lockedFileName.value, 'Private.mp4')
    assert.equal(page.isVideo.value, false)
    assert.deepEqual(requests, [])
    const template = descriptor.template.content
    assert.ok(template.includes('@submit.prevent="unlockShare"'))
    assert.ok(template.includes(":type=\"showPassword ? 'text' : 'password'\""))
    assert.ok(template.includes('Password Protected'))
    assert.ok(template.includes('Unlock File'))
    assert.deepEqual(compileTemplate({ source: template, filename: 'shared-page.vue', id: 'share-test' }).errors, [])
    assert.ok(!/localStorage|sessionStorage/.test(source))
})

test('successful unlocking submits the password only in a POST body and refreshes the preview', async () => {
    const { page, requests, refreshes } = await setup()
    page.sharePassword.value = 'Correct-password'
    page.showPassword.value = true
    await page.unlockShare()
    assert.deepEqual(requests, [{ url: '/api/shared/share-token/unlock', request: { method: 'POST', body: { password: 'Correct-password' } } }])
    assert.equal(refreshes(), 1)
    assert.equal(page.passwordRequired.value, false)
    assert.equal(page.isVideo.value, true)
    assert.equal(page.itemName.value, 'Private.mp4')
    assert.equal(page.sharePassword.value, '')
    assert.equal(page.showPassword.value, false)
    assert.equal(page.unlocking.value, false)
})

test('incorrect passwords and rate limits keep the file locked with clear English feedback', async () => {
    for (const [statusCode, message] of [
        [401, 'Incorrect password. Please try again.'],
        [429, 'Too many attempts. Please try again later.']
    ]) {
        const { page, refreshes } = await setup({ fetch: async () => { throw { statusCode } } })
        page.sharePassword.value = 'Wrong-password'
        await page.unlockShare()
        assert.equal(page.unlockError.value, message)
        assert.equal(page.passwordRequired.value, true)
        assert.equal(page.isVideo.value, false)
        assert.equal(page.unlocking.value, false)
        assert.equal(refreshes(), 0)
    }
})

test('unlock ignores duplicate submissions while pending and refreshes an expired link into its error state', async () => {
    let resolve
    const pending = new Promise(done => { resolve = done })
    const { page, requests } = await setup({ fetch: () => pending })
    page.sharePassword.value = 'Some-password'
    const first = page.unlockShare()
    assert.equal(page.unlocking.value, true)
    await page.unlockShare()
    assert.equal(requests.length, 1)
    resolve({ success: true })
    await first
    const expired = await setup({ expired: true, fetch: async () => { throw { statusCode: 410 } } })
    expired.page.sharePassword.value = 'Some-password'
    await expired.page.unlockShare()
    assert.equal(expired.refreshes(), 1)
    assert.equal(expired.error.value.statusCode, 410)
    assert.equal(expired.page.passwordRequired.value, false)
    assert.equal(expired.page.isVideo.value, false)
})
