import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { ref, computed, watch, nextTick } from 'vue'
import ts from 'typescript'
import { emptyShareState } from '../shared/types/share.ts'

const source = readFileSync(new URL('../app/components/ui/ShareBox.vue', import.meta.url), 'utf8')
const script = ts.createSourceFile('ShareBox.ts', parse(source).descriptor.scriptSetup.content, ts.ScriptTarget.Latest)
const stripped = ts.factory.updateSourceFile(script, script.statements.filter(node => !ts.isImportDeclaration(node)))
const code = ts.transpileModule(ts.createPrinter().printFile(stripped), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const base = { url: 'http://localhost/shared/same-token', hasPassword: false, expiresAt: null, isExpired: false }

async function setup(options = {}) {
    const props = { itemId: 'file-1', itemType: 'file', embedded: true, initialState: { ...base }, ...options.props }
    const calls = [], changes = [], copied = []
    const env = {
        ref, computed, watch, emptyShareState,
        defineProps: () => props,
        withDefaults: value => value,
        defineEmits: () => (event, state) => { changes.push({ ...state }) },
        useToast: () => ({ openToast: () => {} }),
        onBeforeUnmount: () => {},
        setTimeout: () => 0, clearTimeout: () => {},
        navigator: { clipboard: { writeText: async value => { copied.push(value) } } },
        $fetch: async (url, request) => {
            calls.push({ url, request })
            if (options.fetch) return options.fetch(url, request)
            if (request?.method === 'DELETE') return { success: true }
            return { ...base, hasPassword: request?.body?.passwordAction === 'set', expiresAt: request?.body?.expiresAt ?? null }
        }
    }
    const run = new Function(...Object.keys(env), `${code};return {state,passwordEnabled,password,expiration,customExpiration,isSaving,errorMessage,loadFailed,loadShareLink,saveSettings,removeShareLink,copyShareLink,settingsPayload}`)
    const page = run(...Object.values(env))
    await nextTick()
    return { page, calls, changes, copied }
}

test('initial share state from the file endpoint avoids a duplicate API read', async () => {
    const { page, calls } = await setup()
    assert.equal(page.state.value.url, base.url)
    assert.deepEqual(calls, [])
})

test('adding/changing/removing protection sends explicit actions and never changes the URL locally', async () => {
    const { page, calls, changes } = await setup()
    page.passwordEnabled.value = true
    await page.saveSettings()
    assert.equal(calls.length, 0)
    assert.ok(page.errorMessage.value)
    page.password.value = 'abc'
    await page.saveSettings()
    assert.equal(calls.length, 0)
    assert.equal(page.errorMessage.value, 'Password must contain 4–128 characters.')
    page.password.value = 'abcd'
    await page.saveSettings()
    assert.equal(calls[0].request.method, 'PATCH')
    assert.equal(calls[0].url, '/api/shared/items/file/file-1')
    assert.equal(calls[0].request.body.passwordAction, 'set')
    assert.equal(calls[0].request.body.password, 'abcd')
    assert.equal(page.password.value, '')
    assert.equal(page.state.value.url, base.url)
    assert.equal(changes.at(-1).hasPassword, true)
    page.passwordEnabled.value = false
    await page.saveSettings()
    assert.equal(calls[1].request.body.passwordAction, 'remove')
    assert.ok(!('password' in calls[1].request.body))
    assert.equal(changes.at(-1).hasPassword, false)
})

test('disabling protection ignores an unfinished password draft and preserves an existing expired deadline', async () => {
    const expiresAt = '2020-01-01T00:00:00.000Z'
    const { page } = await setup({ props: { initialState: { ...base, hasPassword: true, expiresAt, isExpired: true } } })
    page.password.value = 'bad'
    page.passwordEnabled.value = false
    assert.deepEqual(page.settingsPayload(), { passwordAction: 'remove', expiresAt })
})

test('keeping a protected link does not resend a password; custom dates retain original precision', async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString()
    const { page } = await setup({ props: { initialState: { ...base, hasPassword: true, expiresAt } } })
    const payload = page.settingsPayload()
    assert.equal(payload.passwordAction, 'keep')
    assert.ok(!('password' in payload))
    assert.equal(payload.expiresAt, expiresAt)
    page.expiration.value = '7'
    assert.ok(Math.abs(new Date(page.settingsPayload().expiresAt).getTime() - Date.now() - 7 * 86400000) < 1000)
    page.expiration.value = 'never'
    assert.equal(page.settingsPayload().expiresAt, null)
})

test('link creation includes protection and expiry in the same request', async () => {
    const { page, calls } = await setup({ props: { initialState: emptyShareState() } })
    page.passwordEnabled.value = true
    page.password.value = 'Create-password-123'
    page.expiration.value = '30'
    await page.saveSettings()
    assert.equal(calls[0].url, '/api/shared')
    assert.equal(calls[0].request.method, 'POST')
    assert.equal(calls[0].request.body.itemId, 'file-1')
    assert.equal(calls[0].request.body.passwordAction, 'set')
    assert.ok(calls[0].request.body.expiresAt)
})

test('failed saves keep existing state and draft so the user can retry', async () => {
    const { page } = await setup({ fetch: async () => { throw { data: { message: 'Settings could not be saved.' } } } })
    page.passwordEnabled.value = true
    page.password.value = 'Retry-password-123'
    await page.saveSettings()
    assert.equal(page.errorMessage.value, 'Settings could not be saved.')
    assert.equal(page.state.value.url, base.url)
    assert.equal(page.state.value.hasPassword, false)
    assert.equal(page.password.value, 'Retry-password-123')
    assert.equal(page.isSaving.value, false)
})

test('copy and remove operate on the current link and publish updated status', async () => {
    const { page, copied, calls, changes } = await setup()
    await page.copyShareLink()
    assert.deepEqual(copied, [base.url])
    await page.removeShareLink()
    assert.equal(calls[0].request.method, 'DELETE')
    assert.equal(calls[0].url, '/api/shared/items/file/file-1')
    assert.equal(page.state.value.url, null)
    assert.deepEqual(changes.at(-1), emptyShareState())
})
