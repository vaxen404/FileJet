import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { computed, reactive, ref, watch } from 'vue'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

async function load(path, bindings, result, async = false) {
    let source = await fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    if (path.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    const code = stripTypeScriptTypes(source).replace(/^import .+$/gm, '').replace(/^export /gm, '')
    const Constructor = async ? Object.getPrototypeOf(async function () {}).constructor : Function
    return new Constructor(...Object.keys(bindings), `${code}\nreturn ${result}`)(...Object.values(bindings))
}

const noteFile = (name = 'note.txt') => new File(['note content'], name, { type: 'text/plain' })

async function fixture(options = {}) {
    const requests = [], fetches = []
    class XHR {
        upload = {}
        headers = {}
        constructor() { requests.push(this) }
        open(method, url) { this.method = method; this.url = url }
        setRequestHeader(key, value) { this.headers[key] = value }
        send(body) {
            if (options.sendError) throw options.sendError
            this.body = body
        }
        progress(loaded, total, lengthComputable = true) { this.upload.onprogress({ loaded, total, lengthComputable }) }
        complete(status = 201, response = {}) { this.status = status; this.response = response; this.onload() }
    }
    const useNoteActions = await load('app/composables/actions/useNotesActions.ts', {
        computed, reactive, ref, File, FormData, XMLHttpRequest: XHR,
        async $fetch(url, options) { fetches.push({ url, options }) }
    }, 'useNoteActions')
    return { actions: useNoteActions(), requests, fetches }
}

function assertIdle(actions) {
    assert.equal(actions.isUploading.value, false)
    assert.equal(actions.isLoading.value, false)
    assert.equal(actions.uploadProgress.value, null)
}

test('single-note upload uses real multipart XHR byte progress and waits for the response', async () => {
    const f = await fixture()
    assertIdle(f.actions)
    let completed = 0
    const pending = f.actions.uploadNote(noteFile(), async () => { completed++ })
    const xhr = f.requests[0]
    assert.equal(xhr.method, 'POST')
    assert.equal(xhr.url, '/api/notes/upload')
    assert.equal(xhr.responseType, 'json')
    assert.deepEqual(xhr.headers, { Accept: 'application/json' })
    assert.equal(xhr.body.get('files').name, 'note.txt')
    assert.equal(f.fetches.length, 0)
    assert.equal(f.actions.isUploading.value, true)
    assert.equal(f.actions.isLoading.value, true)
    assert.equal(f.actions.uploadProgress.value, null)
    xhr.progress(0, 400)
    assert.equal(f.actions.uploadProgress.value, 0)
    xhr.progress(100, 400)
    assert.equal(f.actions.uploadProgress.value, 25)
    xhr.progress(400, 400)
    assert.equal(f.actions.uploadProgress.value, 100)
    assert.equal(completed, 0)
    assert.equal(f.actions.isLoading.value, true)
    xhr.complete()
    await pending
    assert.equal(completed, 1)
    assertIdle(f.actions)
})

test('multiple selected files share one multipart request and empty selections do nothing', async () => {
    const f = await fixture()
    await f.actions.uploadNote([])
    assert.equal(f.requests.length, 0)
    const pending = f.actions.uploadNote([noteFile('one.txt'), noteFile('two.md')])
    assert.equal(f.requests.length, 1)
    assert.deepEqual(f.requests[0].body.getAll('files').map(file => file.name), ['one.txt', 'two.md'])
    f.requests[0].complete()
    await pending
    assertIdle(f.actions)
})

test('unknown totals remain indeterminate and measurable progress stays within 0–100', async () => {
    const f = await fixture()
    const pending = f.actions.uploadNote(noteFile())
    const xhr = f.requests[0]
    xhr.progress(25, 100, false)
    assert.equal(f.actions.uploadProgress.value, null)
    xhr.progress(25, 0)
    assert.equal(f.actions.uploadProgress.value, null)
    xhr.progress(150, 100)
    assert.equal(f.actions.uploadProgress.value, 100)
    xhr.progress(0, 100)
    assert.equal(f.actions.uploadProgress.value, 0)
    xhr.complete()
    await pending
})

test('concurrent uploads aggregate bytes and a failed request does not reset another upload', async () => {
    const f = await fixture()
    const first = f.actions.uploadNote(noteFile('first.txt'))
    const second = f.actions.uploadNote(noteFile('second.txt'))
    f.requests[0].progress(50, 100)
    assert.equal(f.actions.uploadProgress.value, null)
    f.requests[1].progress(75, 300)
    assert.equal(f.actions.uploadProgress.value, 31)
    const rejected = assert.rejects(first, /cancelled/)
    f.requests[0].onabort()
    await rejected
    assert.equal(f.actions.isUploading.value, true)
    assert.equal(f.actions.isLoading.value, true)
    assert.equal(f.actions.uploadProgress.value, 25)
    f.requests[1].complete()
    await second
    assertIdle(f.actions)
})

test('HTTP, network, abort, timeout and synchronous failures reset state without calling success', async () => {
    const cases = [
        [xhr => xhr.complete(400, { message: 'Quota exceeded' }), /Quota exceeded/],
        [xhr => xhr.complete(400, { data: { message: 'Invalid note' } }), /Invalid note/],
        [xhr => xhr.complete(500), /Note upload failed/],
        [xhr => xhr.onerror(), /Note upload failed/],
        [xhr => xhr.onabort(), /cancelled/],
        [xhr => xhr.ontimeout(), /timed out/]
    ]
    for (const [fail, expected] of cases) {
        const f = await fixture()
        let completed = false
        const pending = f.actions.uploadNote(noteFile(), async () => { completed = true })
        const rejected = assert.rejects(pending, expected)
        fail(f.requests[0])
        await rejected
        assert.equal(completed, false)
        assertIdle(f.actions)
        const retry = f.actions.uploadNote(noteFile())
        assert.equal(f.actions.uploadProgress.value, null)
        f.requests[1].complete()
        await retry
        assertIdle(f.actions)
    }
    const f = await fixture({ sendError: new Error('Send failed') })
    await assert.rejects(f.actions.uploadNote(noteFile()), /Send failed/)
    assertIdle(f.actions)
})

test('loading persists during refresh and refresh failure also clears upload state', async () => {
    const f = await fixture()
    let rejectRefresh
    const refresh = new Promise((_, reject) => { rejectRefresh = reject })
    const pending = f.actions.uploadNote(noteFile(), () => refresh)
    f.requests[0].progress(100, 100)
    f.requests[0].complete()
    await Promise.resolve()
    assert.equal(f.actions.isUploading.value, true)
    assert.equal(f.actions.isLoading.value, true)
    const rejected = assert.rejects(pending, /Refresh failed/)
    rejectRefresh(new Error('Refresh failed'))
    await rejected
    assertIdle(f.actions)
})

test('creating a note still sends the JSON API request without creating an upload', async () => {
    const f = await fixture()
    let completed = 0
    await f.actions.createNote({ title: 'Title', content: 'Content' }, async () => { completed++ })
    assert.deepEqual(f.fetches, [{ url: '/api/notes', options: { method: 'POST', body: { title: 'Title', content: 'Content' } } }])
    assert.equal(f.requests.length, 0)
    assert.equal(completed, 1)
    assertIdle(f.actions)
})

async function page(options = {}) {
    const f = await fixture()
    const error = ref(null), pending = ref(false), messages = []
    let refreshes = 0
    const useSelection = await load('app/composables/ui/useSelection.ts', { ref, computed }, 'useSelection')
    const usePagination = await load('app/composables/ui/usePagination.ts', { ref, computed }, 'usePagination')
    const state = await load('app/pages/(user)/notes/index.vue', {
        ref, computed, watch, useSelection, usePagination, definePageMeta() {},
        useNoteActions: () => f.actions,
        useToast: () => ({ openToast: (...args) => messages.push(args) }),
        useUser: () => ({ notes: ref([]), favorites: ref([]), pending, error, async fetchAll() {
            refreshes++
            if (options.refreshError && refreshes > 1) error.value = 'Could not refresh notes'
        } }),
        useSort: items => ({ sortedItems: items })
    }, '({ handleNoteUpload, handleDrop, isLoading, isUploading, uploadProgress, isDragging })', true)
    return { ...f, ...state, messages, refreshes: () => refreshes }
}

test('picker and drop handlers use the same progress state, refresh notes and report results', async () => {
    const f = await page()
    const picker = f.handleNoteUpload([noteFile()])
    f.requests[0].progress(30, 100)
    assert.equal(f.uploadProgress.value, 30)
    assert.equal(f.isLoading.value, true)
    f.requests[0].complete()
    await picker
    assert.equal(f.refreshes(), 2)
    assert.equal(f.messages.at(-1)[1], 'success')
    f.isDragging.value = true
    const dropped = f.handleDrop({ dataTransfer: { files: [noteFile('drop.md')] } })
    assert.equal(f.isDragging.value, false)
    f.requests[1].complete(400, { message: 'Not enough storage space' })
    await dropped
    assert.deepEqual(f.messages.at(-1), ['Not enough storage space', 'error'])
    assert.equal(f.refreshes(), 2)
    assertIdle(f.actions)
})

test('page does not report upload success when refreshing the notes fails', async () => {
    const f = await page({ refreshError: true })
    const pending = f.handleNoteUpload([noteFile()])
    f.requests[0].complete()
    await pending
    assert.deepEqual(f.messages.at(-1), ['Could not refresh notes', 'error'])
    assertIdle(f.actions)
})

test('notes page compiles with the existing progress design and reactive loading binding', async () => {
    const filename = 'app/pages/(user)/notes/index.vue'
    const source = await fs.readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
    const { descriptor, errors } = parse(source, { filename })
    const script = compileScript(descriptor, { id: 'note-upload-check' })
    const template = compileTemplate({ source: descriptor.template.content, filename, id: 'note-upload-check', compilerOptions: { bindingMetadata: script.bindings } })
    const style = compileStyle({ source: descriptor.styles[0].content, filename, id: 'note-upload-check', scoped: true })
    assert.deepEqual([...errors, ...template.errors, ...style.errors], [])
    assert.match(descriptor.template.content, /:is-loading="pending \|\| isLoading"/)
    assert.match(descriptor.template.content, /:aria-valuenow="uploadProgress"/)
    assert.match(descriptor.template.content, /width: `\$\{uploadProgress\}%`/)
})
