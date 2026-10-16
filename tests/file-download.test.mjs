import { resolve, sep } from 'node:path'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { computed, reactive, ref } from 'vue'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

async function load(path, bindings, result) {
    const source = await fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    const code = stripTypeScriptTypes(source.replaceAll('import.meta.client', 'true'))
        .replace(/^import .+$/gm, '')
        .replace(/^export default /gm, 'const handler = ')
        .replace(/^export /gm, '')
    return new Function(...Object.keys(bindings), `${code}\nreturn ${result}`)(...Object.values(bindings))
}

async function server(options = {}) {
    const headers = new Map(), streams = [], queries = []
    const handler = await load('server/api/files/[fileId]/download.get.ts', {
        defineEventHandler: handler => handler,
        getAuthSession: () => options.noSession ? null : { userId: 'owner' },
        enforceRateLimit() {},
        getRouterParam: () => options.fileId ?? 'file-id',
        isUuid: () => true,
        getMethod: () => options.method ?? 'GET',
        prisma: { files: { async findFirst(query) {
            queries.push(query)
            return options.noRecord ? null : { storage_key: 'owner/file.exe', original_name: 'file.exe' }
        } } },
        throwError(statusCode, message) { throw Object.assign(new Error(message), { statusCode }) },
        resolve, sep,
        process: { cwd: () => 'workspace' },
        async stat(path) {
            assert.equal(path, resolve('workspace/storage/owner/file.exe'))
            if (options.diskError) throw Object.assign(new Error('Disk error'), { code: options.diskError })
            return { isFile: () => !options.directory }
        },
        setHeader: (_, key, value) => headers.set(key, value),
        createReadStream(path) { streams.push(path); return path },
        async sendStream() {
            if (options.streamError) throw Object.assign(new Error('Stream error'), { code: options.streamError })
            return 'file contents'
        }
    }, 'handler')
    return { run: () => handler({}), headers, streams, queries }
}

test('download checks authentication and scopes the database query to the owner', async () => {
    const anonymous = await server({ noSession: true })
    await assert.rejects(anonymous.run(), { statusCode: 401 })
    assert.equal(anonymous.queries.length, 0)
    const f = await server()
    assert.equal(await f.run(), 'file contents')
    assert.deepEqual(f.queries[0].where, { id: 'file-id', user_id: 'owner' })
    assert.match(f.headers.get('Content-Disposition'), /attachment/)
})

test('missing files and directories return a controlled 404 before download headers or streams', async () => {
    for (const options of [{ noRecord: true }, { diskError: 'ENOENT' }, { diskError: 'ENOTDIR' }, { directory: true }]) {
        const f = await server(options)
        await assert.rejects(f.run(), { statusCode: 404 })
        assert.equal(f.headers.has('Content-Disposition'), false)
        assert.equal(f.streams.length, 0)
    }
})

test('HEAD verifies storage without streaming or marking the response as an attachment', async () => {
    const f = await server({ method: 'HEAD' })
    assert.equal(await f.run(), '')
    assert.equal(f.headers.get('Cache-Control'), 'no-store')
    assert.equal(f.headers.has('Content-Disposition'), false)
    assert.equal(f.streams.length, 0)
    const source = await fs.readFile(new URL('../server/api/files/[fileId]/download.head.ts', import.meta.url), 'utf8')
    assert.match(source, /export \{ default \} from '\.\/download\.get'/)
})

test('awaits stream errors and preserves unexpected disk failures as server errors', async () => {
    for (const options of [{ streamError: 'ENOENT' }, { streamError: 'EACCES' }, { diskError: 'EACCES' }]) {
        const f = await server(options)
        await assert.rejects(f.run(), { statusCode: options.streamError === 'ENOENT' ? 404 : 500 })
    }
})

async function client(options = {}) {
    const events = [], requests = [], link = { click: () => events.push('click'), remove: () => events.push('remove') }
    let release
    const useFileActions = await load('app/composables/actions/useFileActions.ts', {
        ref, computed, reactive, canCopyFile: () => true,
        async $fetch(url, request) {
            requests.push({ url, request })
            if (options.defer) await new Promise(resolve => { release = resolve })
            if (options.error) throw options.error
        },
        document: {
            createElement(tag) { assert.equal(tag, 'a'); events.push('create'); return link },
            body: { appendChild: () => events.push('append') }
        }
    }, 'useFileActions')
    return { actions: useFileActions(), requests, events, link, release: () => release() }
}

test('checks availability before starting a native download without buffering file contents', async () => {
    const f = await client({ defer: true })
    const pending = f.actions.downloadFile('file&id')
    assert.deepEqual(f.requests, [{ url: '/api/files/file%26id/download', request: { method: 'HEAD', retry: 0 } }])
    assert.deepEqual(f.events, [])
    f.release()
    await pending
    assert.deepEqual(f.events, ['create', 'append', 'click', 'remove'])
    assert.equal(f.link.href, f.requests[0].url)
})

test('missing storage rejects with an actionable message and never starts the download', async () => {
    const f = await client({ error: { statusCode: 404 } })
    await assert.rejects(f.actions.downloadFile('missing'), /Please upload it again/)
    assert.deepEqual(f.events, [])
})

test('network and authentication errors propagate without starting a download', async () => {
    for (const error of [new Error('Network failed'), { statusCode: 401 }]) {
        const f = await client({ error })
        await assert.rejects(f.actions.downloadFile('file'), value => value === error)
        assert.deepEqual(f.events, [])
    }
})

test('toast and all download entry points compile', async () => {
    for (const filename of ['app/components/ui/Toast.vue', 'app/pages/(user)/files/index.vue', 'app/pages/(user)/files/[id].vue', 'app/pages/(user)/home/index.vue', 'app/pages/(user)/favorites/index.vue']) {
        const source = await fs.readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
        const { descriptor, errors } = parse(source, { filename })
        const script = compileScript(descriptor, { id: 'download-check' })
        const template = compileTemplate({ source: descriptor.template.content, filename, id: 'download-check', compilerOptions: { bindingMetadata: script.bindings } })
        const style = compileStyle({ source: descriptor.styles[0].content, filename, id: 'download-check', scoped: true })
        assert.deepEqual([...errors, ...template.errors, ...style.errors], [])
    }
})
