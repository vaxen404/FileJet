import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import ts from 'typescript'
import { formatFileSize, formatFileTime, getFileIcon, getFileType, getFileCategory, canCopyFile } from '../app/utils/file.ts'
import { noteSchema } from '../shared/schemas/note.ts'

const require = createRequire(import.meta.url)
const vueGlobals = Object.fromEntries(Object.entries(vue).filter(([name]) => /^[A-Za-z_$][\w$]*$/.test(name)))
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
function script(source) {
    const ast = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest)
    const stripped = ts.factory.updateSourceFile(ast, ast.statements.filter(node => !ts.isImportDeclaration(node)))
    return { ast, code: ts.transpileModule(ts.createPrinter().printFile(stripped).replace(/\bexport\s+/g, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText }
}
function composable(path, name) {
    const { code } = script(read(path))
    return new Function(...Object.keys(vueGlobals), `${code};return ${name}`)(...Object.values(vueGlobals))
}
const useSort = composable('app/composables/ui/useSort.ts', 'useSort')
const usePagination = composable('app/composables/ui/usePagination.ts', 'usePagination')
const useSelection = composable('app/composables/ui/useSelection.ts', 'useSelection')
const useFileDrop = composable('app/composables/ui/useFileDrop.ts', 'useFileDrop')
function compiled(code, env = {}) {
    const module = { exports: {} }
    const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', ...Object.keys(env), output)(require, module, module.exports, ...Object.values(env))
    return module.exports
}
function component(path) {
    const descriptor = parse(read(path)).descriptor
    if (descriptor.scriptSetup) return compiled(compileScript(descriptor, { id: path, inlineTemplate: true }).content, { ...vueGlobals, useFileDrop }).default
    return { render: compiled(compileTemplate({ source: descriptor.template.content, filename: path, id: path }).code).render }
}
const ui = Object.fromEntries(['DataView', 'ItemGrid', 'ItemGridCard', 'UploadProgress', 'Pagination'].map(name => [name, component(`app/components/ui/${name}.vue`)]))
const blank = { render: () => null }
async function render(page, kind) {
    const descriptor = parse(read(`app/pages/(user)/${kind}/index.vue`)).descriptor
    const template = compileTemplate({ source: descriptor.template.content, filename: 'library.vue', id: kind, compilerOptions: { expressionPlugins: ['typescript'] } })
    assert.deepEqual(template.errors, [])
    const app = vue.createSSRApp({ setup: () => ({ formatFileSize, formatFileTime, getFileIcon, getFileType, getFileCategory, canCopyFile, ...page }), render: compiled(template.code).render })
    for (const [name, value] of Object.entries(ui)) app.component(name, value)
    for (const name of ['SearchBox', 'ViewSwitcher', 'UploadButton', 'ItemFilters', 'SortDropdown', 'NoteFormModal']) app.component(name, blank)
    app.component('Icon', { render: () => vue.h('span', { class: 'iconify' }) })
    app.component('ItemMenu', { render: () => vue.h('button', { class: 'menu-trigger' }, 'Actions') })
    const context = {}
    const html = await renderToString(app, context)
    return html + Object.values(context.teleports ?? {}).join('')
}

async function setup(kind, count = 30, options = {}) {
    const records = Array.from({ length: count }, (_, index) => ({
        id: `${kind}-${index}`, name: `File ${index}`, title: `Note ${index}`, original_name: `File ${index}.txt`, content: `Note content ${index}`,
        mime_type: 'text/plain', size: '100', created_at: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(), updated_at: '2026-10-17T12:00:00Z'
    }))
    const data = vue.ref(records), pending = vue.ref(false), error = vue.ref(null), favorites = vue.ref([])
    const uploading = vue.ref(false), processing = vue.ref(false), progress = vue.ref(null)
    const calls = [], toasts = [], elements = [], urls = []
    let finishUpload
    const actions = {
        isLoading: vue.computed(() => uploading.value), isUploading: uploading, isProcessing: processing, uploadProgress: progress, isDeleting: vue.ref(false),
        uploadFiles: upload, uploadNote: upload,
        deleteFiles: async ids => ({ deletedIds: ids, failedIds: [] }),
        deleteNotes: async ids => ({ deletedIds: ids.slice(0, 1), failedIds: ids.slice(1) }),
        deleteFile: async id => { calls.push(['delete', id]) },
        deleteNote: async id => { calls.push(['delete', id]) },
        renameFile: async () => {}, copyFile: async () => {}, downloadFile: async () => {}
    }
    async function upload(files, refresh) {
        uploading.value = true
        try {
            await new Promise((resolve, reject) => { finishUpload = options.uploadError ? () => reject(new Error(options.uploadError)) : resolve })
            await refresh()
        } finally { uploading.value = false }
    }
    const env = {
        ...vueGlobals, useSort, usePagination, useSelection,
        formatFileSize, formatFileTime, getFileIcon, getFileType, getFileCategory, canCopyFile,
        definePageMeta: () => {}, useToast: () => ({ openToast: (...args) => toasts.push(args) }),
        useFileActions: () => actions, useNoteActions: () => actions,
        useFavoriteActions: () => ({
            addFavorite: async (id, type) => { calls.push(['favorite', id, type]); favorites.value.push({ note_id: id }) },
            removeFavorite: async (id, type) => { calls.push(['unfavorite', id, type]); favorites.value = [] }
        }),
        useUser: () => ({
            [kind]: data, favorites, pending, error,
            fetchAll: async () => { calls.push(['refresh']); if (options.refreshError && calls.length > 1) error.value = options.refreshError }
        }),
        navigateTo: path => calls.push(['navigate', path]),
        document: {
            getElementById: () => ({ focus() {}, select() {} }),
            createElement: () => { const element = { click() {}, remove() {} }; elements.push(element); return element },
            body: { appendChild() {} }
        },
        URL: { createObjectURL: blob => { urls.push(blob); return 'blob:note' }, revokeObjectURL() {} },
        setTimeout: fn => fn()
    }
    const descriptor = parse(read(`app/pages/(user)/${kind}/index.vue`)).descriptor
    const { ast, code } = script(descriptor.scriptSetup.content)
    const names = []
    const collect = name => {
        if (ts.isIdentifier(name)) names.push(name.text)
        else for (const element of name.elements) if (ts.isBindingElement(element)) collect(element.name)
    }
    for (const node of ast.statements) if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) collect(declaration.name)
    const page = await new AsyncFunction(...Object.keys(env), `${code};return {${names.join(',')}}`)(...Object.values(env))
    return { page, data, records, pending, error, uploading, processing, progress, calls, toasts, elements, urls, finish: () => finishUpload() }
}

for (const kind of ['files', 'notes']) {
    test(`${kind} keeps Grid/List cards and pagination mounted while uploading and refreshing`, async () => {
        const f = await setup(kind)
        assert.equal(f.page.viewMode.value, 'grid')
        assert.equal(f.page.itemsPerPage.value, 24)
        for (const mode of ['grid', 'list']) {
            f.page.viewMode.value = mode
            await vue.nextTick()
            f.page.currentPage.value = 2
            const before = await render(f.page, kind)
            f.uploading.value = true
            f.pending.value = true
            f.progress.value = 100
            f.processing.value = true
            const during = await render(f.page, kind)
            assert.equal(f.page.isInitialLoading.value, false)
            assert.equal(f.page.currentPage.value, 2)
            assert.ok(during.includes('Processing...'))
            assert.ok(during.includes('aria-valuenow="100"'))
            assert.equal((during.match(/class="file-card/g) ?? []).length, (before.match(/class="file-card/g) ?? []).length)
            assert.ok(during.includes(mode === 'grid' ? 'class="items-grid"' : `${kind}-table`))
            assert.ok(during.indexOf('class="pagination') > during.indexOf(mode === 'grid' ? 'class="items-grid"' : `${kind}-table`))
            f.uploading.value = false
            f.pending.value = false
        }
    })

    test(`${kind} handles initial loading, empty results, errors, search and view-mode pagination`, async () => {
        const f = await setup(kind, 0)
        f.pending.value = true
        assert.ok((await render(f.page, kind)).includes(`Loading ${kind}...`))
        f.pending.value = false
        assert.ok((await render(f.page, kind)).includes(`No ${kind} yet`))
        f.error.value = 'Access failed'
        const failed = await render(f.page, kind)
        assert.ok(failed.includes(`Unable to load ${kind}`))
        assert.ok(failed.includes('Access failed'))
        f.data.value = Array.from({ length: 30 }, (_, id) => ({ id: String(id), name: `File ${id}`, title: `Note ${id}`, original_name: 'item.txt', created_at: '2026-10-17' }))
        f.error.value = null
        f.page.viewMode.value = 'list'
        await vue.nextTick()
        assert.equal(f.page.totalPages.value, 3)
        f.page.currentPage.value = 3
        f.page.searchQuery.value = 'no match'
        await vue.nextTick()
        assert.equal(f.page.currentPage.value, 1)
        assert.equal(f.page.totalPages.value, 0)
        assert.ok((await render(f.page, kind)).includes(`No matching ${kind}`))
    })

    test(`${kind} reports success only after upload and refresh, and reports failures without success`, async () => {
        for (const options of [{}, { uploadError: 'Upload rejected' }, { refreshError: 'Refresh rejected' }]) {
            const f = await setup(kind, 2, options)
            const work = kind === 'files' ? f.page.handleFiles([{}]) : f.page.handleNoteUpload([{}])
            assert.equal(f.toasts.length, 0)
            f.finish()
            await work
            assert.equal(f.uploading.value, false)
            assert.equal(f.toasts.at(-1)[1], Object.keys(options).length ? 'error' : 'success')
            if (options.uploadError) assert.equal(f.calls.filter(call => call[0] === 'refresh').length, 1)
            else assert.equal(f.calls.filter(call => call[0] === 'refresh').length, 2)
        }
    })
}

test('notes open the existing editor and retain context menu, favorite, download and partial bulk-delete actions', async () => {
    const f = await setup('notes', 3)
    const note = f.records[0]
    f.page.openNote(note)
    assert.equal(f.page.noteModalOpen.value, true)
    assert.equal(f.page.noteModalMode.value, 'edit')
    assert.equal(f.page.activeNote.value.id, note.id)
    f.page.createNote()
    assert.equal(f.page.noteModalMode.value, 'create')
    let position
    f.page.setNoteMenuRef(note.id, { openAt: (...args) => { position = args } })
    f.page.openContextMenu({ clientX: 15, clientY: 25 }, note.id)
    assert.deepEqual(position, [15, 25])
    await f.page.favoriteNote(note)
    assert.equal(f.page.isNoteFavorite(note.id), true)
    await f.page.favoriteNote(note)
    assert.equal(f.page.isNoteFavorite(note.id), false)
    f.page.downloadNote(note)
    assert.equal(await f.urls[0].text(), note.content)
    assert.equal(f.elements[0].download, `${note.title}.txt`)
    f.page.selectedNotes.value = f.records.map(note => note.id)
    await f.page.handleDeleteSelected()
    await vue.nextTick()
    assert.deepEqual(f.page.selectedNotes.value, f.records.slice(1).map(note => note.id))
    assert.equal(f.toasts.at(-1)[1], 'error')
    assert.equal(f.page.isBulkDeleting.value, false)
})

test('the note editor uses existing create/update actions and keeps failed saves open', async () => {
    const descriptor = parse(read('app/components/ui/NoteFormModal.vue')).descriptor
    const { code } = script(descriptor.scriptSetup.content)
    for (const mode of ['create', 'edit', 'failure']) {
        const events = [], calls = [], toasts = []
        const env = {
            ...vueGlobals, noteSchema,
            defineProps: () => ({ open: true, mode: mode === 'create' ? 'create' : 'edit', note: { id: 'note-1', title: 'Example', content: 'Original content' } }),
            withDefaults: props => props,
            defineEmits: () => event => events.push(event),
            useToast: () => ({ openToast: (...args) => toasts.push(args) }),
            useNoteActions: () => ({
                isLoading: vue.ref(false),
                createNote: async data => calls.push(['create', data]),
                updateNote: async (id, data) => {
                    if (mode === 'failure') throw new Error('Save rejected')
                    calls.push(['update', id, data])
                }
            })
        }
        const editor = new Function(...Object.keys(env), `${code};return {title,content,saveNote}`)(...Object.values(env))
        editor.title.value = 'Updated'
        editor.content.value = 'Updated content'
        await editor.saveNote()
        if (mode === 'failure') {
            assert.deepEqual(events, [])
            assert.equal(toasts.at(-1)[1], 'error')
        } else {
            assert.deepEqual(events, ['saved', 'close'])
            assert.equal(calls[0][0], mode === 'create' ? 'create' : 'update')
            assert.equal(calls[0].at(-1).title, 'Updated')
        }
    }
})
