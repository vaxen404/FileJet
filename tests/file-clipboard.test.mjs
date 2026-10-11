import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { computed, reactive, ref } from 'vue'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

const projectRoot = new URL('../', import.meta.url)

async function loadSource(path, bindings, returnExpression) {
    const source = await fs.readFile(new URL(path, projectRoot), 'utf8')
    const code = stripTypeScriptTypes(source.replaceAll('import.meta.client', 'true'))
        .replace(/^import .+$/gm, '')
        .replace(/^export /gm, '')
    return new Function(...Object.keys(bindings), `${code}\nreturn ${returnExpression}`)(...Object.values(bindings))
}

const canCopyFile = await loadSource('app/utils/file.ts', {}, 'canCopyFile')
const textFile = { id: 'text-file', mime_type: 'text/plain', original_name: 'notes.txt' }
const pngFile = { id: 'image-file', mime_type: 'image/png', original_name: 'photo.png' }

async function fixture(options = {}) {
    const requests = [], copied = [], events = [], revoked = []
    const canvas = {
        width: 0,
        height: 0,
        getContext() {
            return options.noCanvas ? null : { drawImage() {} }
        },
        toBlob(callback, type) {
            assert.equal(type, 'image/png')
            callback(options.noPng ? null : new Blob(['converted PNG'], { type }))
        }
    }
    class ClipboardItemMock {
        constructor(data) { this.data = data }
        async getType(type) { return await this.data[type] }
    }
    class ImageMock {
        naturalWidth = 640
        naturalHeight = 480
        set src(value) {
            assert.equal(value, 'blob:temporary-image')
            queueMicrotask(() => options.badImage ? this.onerror() : this.onload())
        }
    }
    const clipboard = {
        async write(items) {
            events.push('write')
            if (options.permissionDenied) throw new DOMException('Clipboard permission denied.', 'NotAllowedError')
            for (const item of items) {
                for (const type of Object.keys(item.data)) copied.push(await item.getType(type))
            }
        },
        async writeText(value) { copied.push(value) }
    }
    if (options.textOnly) delete clipboard.write

    const useFileActions = await loadSource('app/composables/actions/useFileActions.ts', {
        ref, computed, reactive, canCopyFile,
        window: { isSecureContext: !options.insecure, location: { origin: 'https://filejet.example' } },
        navigator: { clipboard: options.noClipboard ? undefined : clipboard },
        ClipboardItem: options.textOnly ? undefined : ClipboardItemMock,
        Blob,
        Image: ImageMock,
        URL: {
            createObjectURL() { return 'blob:temporary-image' },
            revokeObjectURL(url) { revoked.push(url) }
        },
        document: {
            createElement(tag) {
                assert.equal(tag, 'canvas')
                return canvas
            }
        },
        $fetch: async (url, requestOptions) => {
            events.push('fetch')
            requests.push({ url, options: requestOptions })
            await Promise.resolve()
            events.push('fetch resolved')
            if (options.fetchError) throw new Error('Preview not found.')
            if (requestOptions.responseType === 'text') return options.text ?? 'Hello, dünya!'
            return new Blob([options.text ?? 'original contents'], { type: options.blobType ?? 'image/png' })
        }
    }, 'useFileActions')

    return { actions: useFileActions(), requests, copied, events, revoked, canvas }
}

test('allows text and images but rejects video, EXE, archives, PDF, audio and missing MIME types', () => {
    for (const mime of ['text/plain', 'text/html', 'image/png', 'image/jpeg', 'IMAGE/PNG']) {
        assert.equal(canCopyFile(mime, 'allowed.file'), true)
    }
    for (const mime of ['video/mp4', 'video/webm', 'VIDEO/MP4', 'application/x-msdownload', 'application/octet-stream', 'application/zip', 'application/x-rar-compressed', 'application/pdf', 'audio/mpeg', null, undefined, '']) {
        assert.equal(canCopyFile(mime, 'blocked.file'), false)
    }
    assert.equal(canCopyFile('text/plain', 'installer.EXE'), false)
    assert.equal(canCopyFile('image/png', 'installer.exe '), false)
})

test('copies text contents rather than a filename and starts clipboard writing during the click', async () => {
    const f = await fixture({ text: 'actual text\nİçerik', blobType: 'text/plain' })
    await f.actions.copyFile(textFile)
    assert.equal(f.copied.length, 1)
    assert.equal(f.copied[0].type, 'text/plain')
    assert.equal(await f.copied[0].text(), 'actual text\nİçerik')
    assert.ok(f.events.indexOf('write') < f.events.indexOf('fetch resolved'))
    assert.deepEqual(f.requests, [{ url: '/api/files/preview?fileId=text-file', options: { responseType: 'blob' } }])
    assert.equal(f.actions.isLoading.value, false)
})

test('copies original PNG bytes without creating a server-side copy', async () => {
    const f = await fixture()
    await f.actions.copyFile(pngFile)
    assert.equal(f.copied[0].type, 'image/png')
    assert.equal(await f.copied[0].text(), 'original contents')
    assert.equal(f.revoked.length, 0)
    assert.ok(f.requests.every(request => request.url.startsWith('/api/files/preview?') && !request.options.method))
})

test('converts other images to PNG using natural dimensions and releases the temporary URL', async () => {
    const f = await fixture({ blobType: 'image/jpeg' })
    await f.actions.copyFile({ ...pngFile, mime_type: 'image/jpeg', original_name: 'photo.jpg' })
    assert.equal(f.canvas.width, 640)
    assert.equal(f.canvas.height, 480)
    assert.equal(await f.copied[0].text(), 'converted PNG')
    assert.deepEqual(f.revoked, ['blob:temporary-image'])
})

test('falls back to writeText for browsers that only support text clipboard access', async () => {
    const f = await fixture({ textOnly: true })
    await f.actions.copyFile(textFile)
    assert.deepEqual(f.copied, ['Hello, dünya!'])
    assert.equal(f.requests[0].options.responseType, 'text')
    await assert.rejects(f.actions.copyFile(pngFile), /does not support copying images/)
})

test('unsupported video copying reports an error without downloading or claiming success', async () => {
    for (const options of [{}, { textOnly: true }]) {
        const f = await fixture(options)
        await assert.rejects(
            f.actions.copyFile({ ...pngFile, mime_type: 'video/mp4', original_name: 'clip.mp4' }),
            /Only text and image files can be copied to the clipboard/
        )
        assert.equal(f.requests.length, 0)
        assert.equal(f.copied.length, 0)
        assert.equal(f.actions.isLoading.value, false)
    }
})

test('rejects unsupported files before requesting any contents', async () => {
    const f = await fixture()
    for (const mime of ['application/x-msdownload', 'application/zip', 'application/pdf', null]) {
        await assert.rejects(f.actions.copyFile({ ...pngFile, mime_type: mime }), /Only text and image/)
    }
    await assert.rejects(f.actions.copyFile({ ...pngFile, original_name: 'fake.exe' }), /Only text and image/)
    assert.equal(f.requests.length, 0)
    assert.equal(f.copied.length, 0)
})

test('reports unavailable clipboard APIs and insecure contexts without a false success', async () => {
    for (const options of [{ insecure: true }, { noClipboard: true }]) {
        const f = await fixture(options)
        await assert.rejects(f.actions.copyFile(pngFile), /HTTPS or localhost/)
        assert.equal(f.copied.length, 0)
        assert.equal(f.requests.length, 0)
    }
})

test('propagates preview and permission errors and resets the loading state', async () => {
    for (const options of [{ fetchError: true }, { permissionDenied: true }]) {
        const f = await fixture(options)
        await assert.rejects(f.actions.copyFile(pngFile))
        assert.equal(f.actions.isLoading.value, false)
        assert.equal(f.copied.length, 0)
    }
})

test('cleans up conversion resources when image decoding or PNG conversion fails', async () => {
    for (const options of [{ badImage: true }, { noCanvas: true }, { noPng: true }]) {
        const f = await fixture(options)
        await assert.rejects(f.actions.copyFile({ ...pngFile, mime_type: 'image/jpeg' }))
        assert.deepEqual(f.revoked, ['blob:temporary-image'])
        assert.equal(f.actions.isLoading.value, false)
        assert.equal(f.copied.length, 0)
    }
})

test('copy UI compiles and both list and detail variants receive the type restriction', async () => {
    for (const filename of ['app/components/ui/ItemMenu.vue', 'app/components/ui/DetailsPanel.vue', 'app/pages/(user)/files/index.vue', 'app/pages/(user)/files/[id].vue']) {
        const source = await fs.readFile(new URL(filename, projectRoot), 'utf8')
        const { descriptor, errors } = parse(source, { filename })
        const script = compileScript(descriptor, { id: 'clipboard-test' })
        const template = compileTemplate({ source: descriptor.template.content, filename, id: 'clipboard-test', compilerOptions: { bindingMetadata: script.bindings } })
        const style = compileStyle({ source: descriptor.styles[0].content, filename, id: 'clipboard-test', scoped: true })
        assert.deepEqual([...errors, ...template.errors, ...style.errors], [])
        if (filename.includes('pages/')) {
            assert.equal(source.match(/:can-copy=/g)?.length, 2)
        } else {
            assert.match(descriptor.template.content, /&& canCopy &&/)
        }
    }
})
