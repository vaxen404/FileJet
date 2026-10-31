import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createError } from 'h3'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import * as vue from 'vue'
import ts from 'typescript'
import { getStorageCategory, summarizeStorageUsage } from '../server/utils/storageUsage.ts'
import { formatFileSize } from '../app/utils/file.ts'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
const group = (mime_type, size, item_type) => ({ mime_type, _sum: { size }, ...(item_type ? { item_type } : {}) })

test('storage categories classify images, videos and document MIME families without counting archives as documents', () => {
    for (const mime of ['image/png', 'image/jpeg', 'IMAGE/WEBP; charset=binary', 'image/svg+xml']) assert.equal(getStorageCategory(mime), 'images')
    for (const mime of ['video/mp4', 'video/webm']) assert.equal(getStorageCategory(mime), 'videos')
    for (const mime of ['application/pdf', 'text/plain', 'text/csv', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.spreadsheet']) assert.equal(getStorageCategory(mime), 'documents')
    for (const mime of [null, '', 'application/octet-stream', 'application/zip', 'audio/mpeg']) assert.equal(getStorageCategory(mime), 'others')
})

test('storage includes notes and trashed bytes once, ignoring folder container sizes', () => {
    const result = summarizeStorageUsage({ limit: 10000n,
        files: [group('image/png', 1000n), group('application/pdf', 2000n), group('video/mp4', 3000n), group(null, 400n)],
        notes: 100n,
        trash: [group('image/jpeg', 200n, 'file'), group(null, 50n, 'note'), group(null, 99999n, 'folder')]
    })
    assert.deepEqual(result.categories, { images: '1200', documents: '2150', videos: '3000', others: '400' })
    assert.equal(result.storageUsed, '6750')
    assert.equal(Object.values(result.categories).reduce((sum, value) => sum + BigInt(value), 0n).toString(), result.storageUsed)
    assert.doesNotThrow(() => JSON.stringify(result))
})

test('empty storage and null sums are zero, while large byte counts retain integer precision', () => {
    assert.deepEqual(summarizeStorageUsage({ limit: null, files: [], notes: null, trash: [] }), {
        storageUsed: '0', storageLimit: '0', categories: { images: '0', documents: '0', videos: '0', others: '0' }
    })
    const large = 9007199254740993n
    const result = summarizeStorageUsage({ limit: large * 2n, files: [group('image/png', large), group(null, null)], notes: 1n, trash: [] })
    assert.equal(result.storageUsed, '9007199254740994')
})

function apiFixture(options = {}) {
    const calls = [], headers = {}, owner = 'owner', other = 'other'
    const data = {
        files: [{ user_id: owner, folder_id: null, mime_type: 'image/png', size: 100n },
            { user_id: owner, folder_id: 'nested', mime_type: 'video/mp4', size: 200n },
            { user_id: other, folder_id: null, mime_type: 'image/png', size: 9999n }],
        notes: [{ user_id: owner, size: 50n }, { user_id: other, size: 9999n }],
        trash: [{ user_id: owner, item_type: 'file', mime_type: 'application/zip', size: 25n },
            { user_id: owner, item_type: 'note', mime_type: null, size: 5n },
            { user_id: owner, item_type: 'folder', mime_type: null, size: 999n },
            { user_id: other, item_type: 'file', mime_type: 'image/png', size: 9999n }]
    }
    data.request_uploads = []
    const grouped = (table, query) => {
        calls.push({ table, query })
        const rows = data[table].filter(row => row.user_id === (query.where.user_id ?? query.where.request?.user_id)
            && (!query.where.item_type || query.where.item_type.in.includes(row.item_type))
            && (!query.where.status || row.status === query.where.status))
        const groups = new Map()
        for (const row of rows) {
            const key = JSON.stringify(query.by.map(column => row[column]))
            if (!groups.has(key)) groups.set(key, { ...Object.fromEntries(query.by.map(column => [column, row[column]])), _sum: { size: 0n } })
            groups.get(key)._sum.size += row.size
        }
        return [...groups.values()]
    }
    const tx = {
        users: { findUnique: async query => { calls.push({ table: 'users', query }); return options.missing ? null : { storage_limit: 1000n } } },
        files: { groupBy: async query => grouped('files', query) },
        notes: { aggregate: async query => {
            calls.push({ table: 'notes', query })
            return { _sum: { size: data.notes.filter(row => row.user_id === query.where.user_id).reduce((sum, row) => sum + row.size, 0n) } }
        } },
        trash: { groupBy: async query => grouped('trash', query) },
        request_uploads: { groupBy: async query => grouped('request_uploads', query) }
    }
    let transactionOptions
    const imports = {
        '~~/server/utils/prisma': { prisma: { $transaction: async (fn, settings) => {
            transactionOptions = settings
            if (options.fail) throw new Error('SECRET database details')
            return fn(tx)
        } } },
        '~~/server/utils/auth': { getAuthSession: () => options.anonymous ? null : { userId: owner } },
        '~~/server/utils/error': { throwError: (statusCode, message) => { throw createError({ statusCode, message }) } },
        '~~/server/utils/storageUsage': { summarizeStorageUsage }
    }
    const module = { exports: {} }
    const code = ts.transpileModule(read('server/api/users/@me/storage.get.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', 'defineEventHandler', 'setHeader', code)(
        name => { assert.ok(imports[name], name); return imports[name] }, module, module.exports,
        handler => handler, (_, name, value) => { headers[name] = value })
    return { run: () => module.exports.default({ query: { userId: other } }), calls, headers, transactionOptions: () => transactionOptions, data }
}

test('storage endpoint uses one consistent, private account snapshot including nested files and Trash', async () => {
    const f = apiFixture()
    assert.deepEqual(await f.run(), { storageUsed: '380', storageLimit: '1000', categories: { images: '100', documents: '55', videos: '200', others: '25' } })
    assert.deepEqual(f.transactionOptions(), { isolationLevel: 'RepeatableRead' })
    assert.equal(f.headers['Cache-Control'], 'private, no-store')
    for (const call of f.calls) {
        assert.deepEqual(call.query.where.user_id ?? call.query.where.id ?? call.query.where.request?.user_id, 'owner')
        assert.equal('folder_id' in call.query.where, false)
    }
    // Moving an image to Trash preserves used bytes; permanent deletion removes them.
    f.data.files.splice(0, 1)
    f.data.trash.push({ user_id: 'owner', item_type: 'file', mime_type: 'image/png', size: 100n })
    assert.equal((await f.run()).categories.images, '100')
    f.data.trash.pop()
    assert.equal((await f.run()).storageUsed, '280')
})

test('storage endpoint requires a valid session and sanitizes database errors', async () => {
    const anonymous = apiFixture({ anonymous: true })
    await assert.rejects(anonymous.run(), { statusCode: 401 })
    assert.equal(anonymous.calls.length, 0)
    await assert.rejects(apiFixture({ missing: true }).run(), { statusCode: 401 })
    await assert.rejects(apiFixture({ fail: true }).run(), error => error.statusCode === 500 && !error.message.includes('SECRET'))
})

test('pending Inbox bytes count toward quota once and approval preserves totals while rejection releases bytes', async () => {
    const fixture = apiFixture()
    fixture.data.request_uploads.push(
        { user_id: 'owner', status: 'pending', mime_type: 'image/png', size: 40n },
        { user_id: 'owner', status: 'approved', mime_type: 'image/png', size: 900n },
        { user_id: 'other', status: 'pending', mime_type: 'image/png', size: 9999n }
    )
    assert.equal((await fixture.run()).storageUsed, '420')
    fixture.data.request_uploads[0].status = 'approved'
    fixture.data.files.push({ user_id: 'owner', mime_type: 'image/png', size: 40n })
    assert.equal((await fixture.run()).storageUsed, '420')
    fixture.data.request_uploads.push({ user_id: 'owner', status: 'pending', mime_type: 'text/plain', size: 15n })
    assert.equal((await fixture.run()).storageUsed, '435')
    fixture.data.request_uploads.at(-1).status = 'rejected'
    assert.equal((await fixture.run()).storageUsed, '420')
})

async function pageFixture() {
    const storage = vue.ref({ storageUsed: '5242880', storageLimit: '5368709120', categories: { images: '2097152', documents: '524288', videos: '1572864', others: '1048576' } })
    const calls = [], files = vue.ref([{ id: 'file', name: 'Old.pdf' }])
    const env = {
        ...Object.fromEntries(Object.entries(vue).filter(([name]) => /^[A-Za-z_$][\w$]*$/.test(name))),
        formatFileSize, definePageMeta() {}, useToast: () => ({ openToast() {} }),
        useUser: () => ({ user: vue.ref(null), files, folders: vue.ref([]), notes: vue.ref([]), favorites: vue.ref([]), error: vue.ref(null), fetchAll: async () => calls.push('collections') }),
        useFileActions: () => ({ deleteFile: async () => calls.push('delete'), renameFile: async () => calls.push('rename'), isDeleting: vue.ref(false) }),
        useFavoriteActions: () => ({}),
        useFetch: async url => {
            assert.equal(url, '/api/users/@me/storage')
            return { data: storage, error: vue.ref(null), status: vue.ref('success'), refresh: async () => calls.push('storage') }
        }
    }
    const { descriptor } = parse(read('app/pages/(user)/home/index.vue'))
    const ast = ts.createSourceFile('home.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest)
    const stripped = ts.factory.updateSourceFile(ast, ast.statements.filter(node => !ts.isImportDeclaration(node)))
    const code = ts.transpileModule(ts.createPrinter().printFile(stripped), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const page = await new AsyncFunction(...Object.keys(env), `${code};return {storagePercent,storageTypes,editingFileId,editingFileName,saveRename,handleDelete}`)(...Object.values(env))
    return { page, storage, calls, files }
}

test('dashboard uses byte totals, guards zero quota and refreshes storage after file changes', async () => {
    const f = await pageFixture()
    assert.equal(f.page.storagePercent.value.toFixed(2), '0.10')
    assert.deepEqual(f.page.storageTypes.map(row => formatFileSize(f.storage.value.categories[row.key])), ['2.0 MB', '512.0 KB', '1.5 MB', '1.0 MB'])
    f.storage.value.storageLimit = '0'
    assert.equal(f.page.storagePercent.value, 0)
    f.storage.value.storageLimit = '1'
    assert.ok(f.page.storagePercent.value > 100)
    const file = f.files.value[0]
    f.page.editingFileId.value = file.id
    f.page.editingFileName.value = 'New.pdf'
    await f.page.saveRename(file)
    await f.page.handleDelete(file)
    assert.equal(f.calls.filter(call => call === 'storage').length, 2)
})

test('storage dashboard template compiles', () => {
    const file = 'app/pages/(user)/home/index.vue'
    const { descriptor, errors } = parse(read(file))
    assert.deepEqual(errors, [])
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { expressionPlugins: ['typescript'] } }).errors, [])
})
