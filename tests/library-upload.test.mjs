import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { ref, computed, reactive } from 'vue'
import ts from 'typescript'

function load(path, name, env = {}) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replaceAll('import.meta.client', 'false')
    const ast = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest)
    const stripped = ts.factory.updateSourceFile(ast, ast.statements.filter(node => !ts.isImportDeclaration(node)))
    const code = ts.transpileModule(ts.createPrinter().printFile(stripped).replaceAll('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const globals = { ref, computed, reactive, ...env }
    return new Function(...Object.keys(globals), `${code}; return ${name}`)(...Object.values(globals))
}

function uploadFixture() {
    const requests = []
    class XHR {
        upload = {}
        open(method, url) { this.method = method; this.url = url }
        setRequestHeader() {}
        send(body) { this.body = body; requests.push(this) }
        progress(loaded, total, lengthComputable = true) { this.upload.onprogress({ loaded, total, lengthComputable }) }
        complete(status = 200, response = {}) { this.status = status; this.response = response; this.onload() }
    }
    const useUpload = load('app/composables/actions/useUpload.ts', 'useUpload', { XMLHttpRequest: XHR })
    return { requests, useUpload }
}
const file = () => new File(['example'], 'example.txt', { type: 'text/plain' })
const tick = () => Promise.resolve()

test('upload progress tracks transmitted bytes and stays Processing until API success and list refresh finish', async () => {
    const { useUpload, requests } = uploadFixture()
    const state = useUpload('/api/files', 'File')
    let refreshed = false, release
    const refresh = new Promise(done => { release = done })
    const work = state.upload([file()], async () => { refreshed = true; await refresh })
    const xhr = requests[0]
    assert.equal(state.isUploading.value, true)
    assert.equal(state.uploadProgress.value, null)
    assert.equal(xhr.url, '/api/files')
    assert.equal(xhr.body.getAll('files').length, 1)
    xhr.progress(499, 1000)
    assert.equal(state.uploadProgress.value, 49)
    xhr.progress(999, 1000)
    assert.equal(state.uploadProgress.value, 99)
    assert.equal(state.isProcessing.value, false)
    xhr.progress(1000, 1000)
    assert.equal(state.uploadProgress.value, 100)
    assert.equal(state.isProcessing.value, true)
    assert.equal(refreshed, false)
    xhr.complete()
    await tick()
    assert.equal(refreshed, true)
    assert.equal(state.isUploading.value, true)
    release()
    await work
    assert.equal(state.isUploading.value, false)
    assert.equal(state.isProcessing.value, false)
    assert.equal(state.uploadProgress.value, null)
})

test('unknown upload lengths remain indeterminate until transfer completes', async () => {
    const { useUpload, requests } = uploadFixture()
    const state = useUpload('/api/notes/upload', 'Note')
    const work = state.upload([file()])
    requests[0].progress(100, 0, false)
    assert.equal(state.uploadProgress.value, null)
    requests[0].upload.onload()
    assert.equal(state.uploadProgress.value, 100)
    assert.equal(state.isProcessing.value, true)
    requests[0].complete()
    await work
    assert.equal(state.isUploading.value, false)
})

test('server, network, abort, timeout and refresh errors clear upload state without false success', async () => {
    for (const kind of ['server', 'network', 'abort', 'timeout', 'refresh']) {
        const { useUpload, requests } = uploadFixture()
        const state = useUpload('/api/notes/upload', 'Note')
        let refreshed = false
        const work = state.upload([file()], async () => {
            refreshed = true
            if (kind === 'refresh') throw new Error('Refresh failed')
        })
        const rejected = assert.rejects(work, kind === 'server' ? /Only TXT and MD/ : kind === 'refresh' ? /Refresh failed/ : /Note upload/)
        const xhr = requests[0]
        if (kind === 'server') xhr.complete(400, { message: 'Only TXT and MD files are supported.' })
        else if (kind === 'refresh') xhr.complete()
        else xhr[`on${kind === 'network' ? 'error' : kind}`]()
        await rejected
        assert.equal(refreshed, kind === 'refresh')
        assert.equal(state.isUploading.value, false)
        assert.equal(state.uploadProgress.value, null)
    }
})

test('concurrent uploads use weighted progress and one completion does not close another upload', async () => {
    const { useUpload, requests } = uploadFixture()
    const state = useUpload('/api/files', 'File')
    const first = state.upload([file()]), second = state.upload([file()])
    requests[0].progress(100, 400)
    requests[1].progress(300, 600)
    assert.equal(state.uploadProgress.value, 40)
    requests[0].complete()
    await first
    assert.equal(state.isUploading.value, true)
    assert.equal(state.uploadProgress.value, 50)
    requests[1].complete()
    await second
    assert.equal(state.isUploading.value, false)
})

test('file and note action composables preserve upload endpoints and loading contracts', async () => {
    for (const [path, name, method, endpoint] of [
        ['useFileActions.ts', 'useFileActions', 'uploadFiles', '/api/files'],
        ['useNotesActions.ts', 'useNoteActions', 'uploadNote', '/api/notes/upload']
    ]) {
        const { useUpload, requests } = uploadFixture()
        const state = load(`app/composables/actions/${path}`, name, { useUpload })()
        const work = state[method]([file()])
        assert.equal(requests[0].url, endpoint)
        assert.equal(state.isLoading.value, true)
        requests[0].complete()
        await work
        assert.equal(state.isLoading.value, false)
    }
})

function dropFixture() {
    const listeners = new Map(), cleanups = [], drops = []
    const window = {
        innerWidth: 1200, innerHeight: 800,
        addEventListener(name, listener) { listeners.set(name, listener) },
        removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name) }
    }
    const useFileDrop = load('app/composables/ui/useFileDrop.ts', 'useFileDrop', {
        window, onMounted: fn => fn(), onBeforeUnmount: fn => cleanups.push(fn)
    })
    let enabled = true
    const state = useFileDrop(event => drops.push(event), () => enabled)
    const event = (type, files = true) => ({
        type, clientX: 200, clientY: 200, relatedTarget: null, prevented: false,
        dataTransfer: { types: files ? ['Files'] : ['text/plain'], items: [], files: files ? [file()] : [], dropEffect: 'none' },
        preventDefault() { this.prevented = true }
    })
    return { state, listeners, cleanups, drops, event, disable: () => { enabled = false } }
}

test('file drop ignores text drags and keeps its overlay steady when crossing child elements', () => {
    const { state, event, drops } = dropFixture()
    const text = event('dragenter', false)
    state.dragenter(text)
    state.dragover(text)
    assert.equal(state.isDragging.value, false)
    assert.equal(text.prevented, false)
    state.dragenter(event('dragenter'))
    state.dragenter(event('dragenter'))
    state.dragleave(event('dragleave'))
    assert.equal(state.isDragging.value, true)
    const over = event('dragover')
    state.dragover(over)
    assert.equal(over.prevented, true)
    assert.equal(over.dataTransfer.dropEffect, 'copy')
    state.dragleave(event('dragleave'))
    assert.equal(state.isDragging.value, false)
    state.dragenter(event('dragenter'))
    const drop = event('drop')
    state.drop(drop)
    assert.equal(state.isDragging.value, false)
    assert.equal(drop.prevented, true)
    assert.deepEqual(drops, [drop])
})

test('window drop prevention, cancellation, boundary exits and unmount cleanup reset the drop overlay', () => {
    const { state, event, listeners, cleanups, drops, disable } = dropFixture()
    for (const [name, value] of [['keydown', { key: 'Escape' }], ['dragend', {}], ['blur', {}], ['dragleave', { ...event('dragleave'), clientX: 0 }]]) {
        state.dragenter(event('dragenter'))
        listeners.get(name)(value)
        assert.equal(state.isDragging.value, false, name)
    }
    state.dragenter(event('dragenter'))
    const outsideDrop = event('drop')
    listeners.get('drop')(outsideDrop)
    assert.equal(outsideDrop.prevented, true)
    assert.equal(state.isDragging.value, false)
    assert.deepEqual(drops, [])
    const text = event('dragover', false)
    listeners.get('dragover')(text)
    assert.equal(text.prevented, false)
    disable()
    state.dragenter(event('dragenter'))
    assert.equal(state.isDragging.value, false)
    cleanups.forEach(fn => fn())
    assert.equal(listeners.size, 0)
})
