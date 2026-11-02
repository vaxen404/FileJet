import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test, afterEach } from 'node:test'
import { createRequire } from 'node:module'
import { renderToString } from '@vue/server-renderer'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import * as vue from 'vue'
import { noteSchema } from '../shared/schemas/note.ts'
import { getFileReturnPage } from '../app/utils/fileNavigation.ts'
import { formatFileSize, formatFileTime, getFileIcon, canCopyFile } from '../app/utils/file.ts'
import { getDroppedUploadItems } from '../app/utils/folderUpload.ts'
import { renderMarkdown } from '../app/utils/markdown.ts'
import { useNoteAutosave } from '../app/composables/ui/useNoteAutosave.ts'

const noteScopes = []
afterEach(() => { while (noteScopes.length) noteScopes.pop().stop() })

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const require = createRequire(import.meta.url)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const vueGlobals = Object.fromEntries(Object.entries(vue).filter(([name]) => /^[A-Za-z_$][\w$]*$/.test(name)))

function executable(source, globals) {
    const ast = ts.createSourceFile('details.ts', source, ts.ScriptTarget.Latest)
    const stripped = ts.factory.updateSourceFile(ast, ast.statements.filter(node => !ts.isImportDeclaration(node)))
    const code = ts.transpileModule(ts.createPrinter().printFile(stripped).replace(/\bexport\s+/g, ''), {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText
    const names = []
    const collect = name => {
        if (ts.isIdentifier(name)) names.push(name.text)
        else for (const part of name.elements) if (ts.isBindingElement(part)) collect(part.name)
    }
    for (const statement of ast.statements) {
        if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) collect(declaration.name)
    }
    return new AsyncFunction(...Object.keys(globals), `${code}; return { ${names.join(',')} }`)(...Object.values(globals))
}

const sharing = { url: null, hasPassword: false, expiresAt: null, isExpired: false }
const originalNote = {
    id: 'note-1', user_id: 'owner', folder_id: null, title: 'Original', content: 'Saved note content', size: '18',
    created_at: '2026-10-18T10:00:00.000Z', updated_at: '2026-10-18T10:00:00.000Z', folder: null, share: sharing
}

async function notePage(options = {}) {
    const note = vue.ref({ ...originalNote, ...options.note })
    const listed = vue.ref([{ ...originalNote }])
    const calls = [], toasts = [], routes = []
    const saving = vue.ref(false)
    const env = {
        ...vueGlobals, noteSchema, formatFileSize, formatFileTime, getFileReturnPage,
        definePageMeta() {},
        useRoute: () => ({ params: { noteId: 'note-1' }, query: options.query ?? {} }),
        useRouter: () => ({ push: async value => routes.push(value) }),
        useFetch: async () => ({ data: note, refresh: async () => {} }),
        useDetailsHeader: () => {}, useUnsavedChanges: () => {},
        useNoteAutosave: options => {
            const scope = vue.effectScope()
            noteScopes.push(scope)
            return scope.run(() => useNoteAutosave({ ...options, delay: 60000 }))
        },
        useNoteActions: () => ({
            isDeleting: saving,
            updateNote: async (id, data) => {
                calls.push(['save', id, data])
                if (options.save) return options.save(id, data)
                return { note: { ...originalNote, ...data, updated_at: '2026-10-18T11:00:00.000Z' } }
            },
            deleteNote: async id => calls.push(['delete', id])
        }),
        useFavoriteActions: () => ({ addFavorite: async () => {}, removeFavorite: async () => {} }),
        useUser: () => ({ notes: listed, favorites: vue.ref([]), fetchFavorites: async () => {} }),
        useToast: () => ({ openToast: (...args) => toasts.push(args) }),
        window: { confirm: () => true },
        document: { createElement: () => ({ click() {} }) }
    }
    const descriptor = parse(read('app/pages/(user)/notes/[noteId].vue')).descriptor
    const page = await executable(descriptor.scriptSetup.content, env)
    return { page, note, listed, calls, toasts, routes }
}

test('note details edit saved content, persist both fields, update metadata and retain the return folder', async () => {
    const f = await notePage({ query: { from: '/folders/00000000-0000-0000-0000-000000000001' } })
    assert.equal(f.page.activeTab.value, 'details')
    f.page.activeTab.value = 'edit'
    f.page.draftTitle.value = 'Updated'
    f.page.draftContent.value = 'Changed content'
    assert.equal(f.page.dirty.value, true)
    await f.page.save()
    assert.equal(f.calls[0][2].expectedUpdatedAt, originalNote.updated_at)
    assert.equal(f.note.value.content, 'Changed content')
    assert.equal(f.listed.value[0].title, 'Updated')
    assert.equal(f.page.dirty.value, false)
    assert.equal(f.page.metadataRows.value.find(row => row.label === 'Word count').value, 2)
    await f.page.remove()
    assert.deepEqual(f.calls.at(-1), ['delete', 'note-1'])
    assert.equal(f.listed.value.length, 0)
    assert.deepEqual(f.routes, ['/folders/00000000-0000-0000-0000-000000000001'])
})

test('note validation, failed saves and cancellation preserve drafts without overwriting saved data', async () => {
    const f = await notePage({ save: async () => { throw { data: { message: 'Conflict: the note changed.' } } } })
    f.page.activeTab.value = 'edit'
    f.page.draftTitle.value = ''
    await f.page.save()
    assert.equal(f.calls.length, 0)
    f.page.draftTitle.value = 'Draft'
    f.page.draftContent.value = 'Unsaved text'
    await f.page.save()
    assert.equal(f.note.value.content, originalNote.content)
    assert.equal(f.page.draftContent.value, 'Unsaved text')
    assert.equal(f.page.dirty.value, true)
    assert.equal(f.page.isSaving.value, false)
    assert.equal(f.page.saveError.value, 'Conflict: the note changed.')
    f.page.cancel()
    assert.equal(f.page.draftTitle.value, originalNote.title)
    assert.equal(f.page.dirty.value, false)
})

test('saving prevents duplicate note requests and changes are clean only after the server responds', async () => {
    let finish
    const f = await notePage({ save: () => new Promise(resolve => { finish = resolve }) })
    f.page.activeTab.value = 'edit'
    f.page.draftTitle.value = 'Pending'
    const request = f.page.save()
    assert.equal(f.page.busy.value, true)
    await f.page.save()
    assert.equal(f.calls.length, 1)
    assert.equal(f.page.dirty.value, true)
    finish({ note: { ...originalNote, title: 'Pending' } })
    await request
    assert.equal(f.page.busy.value, false)
    assert.equal(f.page.dirty.value, false)
})

function markdownComponent(filename) {
    const descriptor = parse(read(filename)).descriptor
    const script = compileScript(descriptor, { id: filename, inlineTemplate: true })
    const code = ts.transpileModule(script.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
    const output = { exports: {} }
    new Function('require', 'exports', ...Object.keys(vueGlobals), code)(name => name === '~/utils/markdown' ? { renderMarkdown } : require(name), output.exports, ...Object.values(vueGlobals))
    return output.exports.default
}

async function renderNote(page) {
    const descriptor = parse(read('app/pages/(user)/notes/[noteId].vue')).descriptor
    const { code, errors } = compileTemplate({ source: descriptor.template.content, filename: 'NoteDetails.vue', id: 'note-read-edit' })
    assert.deepEqual(errors, [])
    const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
    const output = { exports: {} }
    new Function('require', 'exports', compiled)(require, output.exports)
    const app = vue.createSSRApp({ setup: () => ({ ...page, formatFileSize }), render: output.exports.render })
    app.component('DetailsWorkspace', {
        inheritAttrs: false,
        setup: (_, { slots }) => () => vue.h('section', [slots.default?.(), slots.edit?.()])
    })
    app.component('Icon', { render: () => vue.h('span', { class: 'iconify' }) })
    app.component('MarkdownContent', markdownComponent('app/components/ui/MarkdownContent.vue'))
    app.component('MarkdownEditor', markdownComponent('app/components/ui/MarkdownEditor.vue'))
    app.component('NuxtLink', { render() { return vue.h('a', this.$slots.default?.()) } })
    return renderToString(app)
}

test('notes initially render a reading area; Edit exposes controls and Save returns to reading', async () => {
    const f = await notePage()
    assert.equal(f.page.isEditing.value, false)
    const reading = await renderNote(f.page)
    assert.match(reading, /class="note-reader(?:\s[^"]*)?"/)
    assert.ok(reading.includes(originalNote.content))
    assert.doesNotMatch(reading, /<input\b|<textarea\b|<form\b/)
    f.page.activeTab.value = 'edit'
    assert.equal(f.page.isEditing.value, true)
    const editing = await renderNote(f.page)
    assert.match(editing, /<textarea\b/)
    assert.match(editing, /id="note-title"/)
    f.page.draftContent.value = 'Updated through Edit'
    await f.page.save()
    assert.equal(f.page.activeTab.value, 'details')
    const saved = await renderNote(f.page)
    assert.ok(saved.includes('Updated through Edit'))
    assert.doesNotMatch(saved, /<textarea\b/)
})

test('Details and Share keep note drafts; Cancel restores saved content and empty notes have a read state', async () => {
    const f = await notePage()
    f.page.activeTab.value = 'edit'
    f.page.draftTitle.value = 'Unsaved title'
    f.page.draftContent.value = 'Unsaved body'
    for (const tab of ['details', 'share']) {
        f.page.activeTab.value = tab
        assert.equal(f.page.isEditing.value, false)
        const html = await renderNote(f.page)
        assert.ok(html.includes(originalNote.content))
        assert.ok(!html.includes('Unsaved body'))
        assert.doesNotMatch(html, /<textarea\b/)
        await f.page.save()
        assert.equal(f.calls.length, 0)
    }
    f.page.activeTab.value = 'edit'
    assert.equal(f.page.draftContent.value, 'Unsaved body')
    f.page.cancel()
    assert.equal(f.page.dirty.value, false)
    assert.equal(f.page.activeTab.value, 'details')
    assert.equal(f.page.draftContent.value, originalNote.content)
    const empty = await notePage({ note: { content: '' } })
    assert.match(await renderNote(empty.page), /This note is empty/)
    assert.equal((await notePage({ query: { tab: 'edit' } })).page.isEditing.value, true)
})

test('note reader renders saved Markdown while the editor retains its unchanged source', async () => {
    const source = '# A heading\n\n**Bold**\n\n    indented code\n'
    const f = await notePage({ note: { content: source } })
    const reading = await renderNote(f.page)
    assert.match(reading, /<h1>A heading<\/h1>/)
    assert.match(reading, /<strong>Bold<\/strong>/)
    f.page.activeTab.value = 'edit'
    const editing = await renderNote(f.page)
    assert.match(editing, /<textarea[^>]*>[\s\S]*# A heading/)
    assert.equal(f.page.draftContent.value, source)
    assert.equal(f.page.dirty.value, false)
})

async function composable(file, name) {
    const result = await executable(read(file), vueGlobals)
    return result[name]
}

test('folder contents use existing Grid/List pagination, search, sorting, selection and right-click positioning', async () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
        id: `item-${index}`, type: index === 0 ? 'folder' : index === 1 ? 'note' : 'file', name: `Item ${String(index).padStart(2, '0')}`,
        size: '10', mime_type: 'text/plain', original_name: `Item ${index}.txt`, created_at: new Date(2026, 9, index + 1).toISOString(), updated_at: null
    }))
    const props = vue.reactive({ items, favoriteIds: [], busy: false, pending: false, readOnly: false })
    const env = {
        ...vueGlobals, canCopyFile, formatFileSize, formatFileTime, getFileIcon,
        defineProps: () => props, withDefaults: value => value, defineEmits: () => {},
        useSort: await composable('app/composables/ui/useSort.ts', 'useSort'),
        usePagination: await composable('app/composables/ui/usePagination.ts', 'usePagination'),
        useSelection: await composable('app/composables/ui/useSelection.ts', 'useSelection')
    }
    const page = await executable(parse(read('app/components/ui/FolderBrowser.vue')).descriptor.scriptSetup.content, env)
    assert.equal(page.view.value, 'grid')
    assert.equal(page.paginatedItems.value.length, 24)
    page.view.value = 'list'
    await vue.nextTick()
    assert.equal(page.paginatedItems.value.length, 12)
    page.currentPage.value = 2
    let position
    page.setMenu('item-0', { openAt: (...args) => { position = args } })
    page.contextMenu({ clientX: 50, clientY: 90 }, items[0])
    assert.deepEqual(position, [50, 90])
    props.readOnly = true
    position = null
    page.contextMenu({ clientX: 1, clientY: 1 }, items[0])
    assert.equal(position, null)
    page.search.value = 'Item 01'
    await vue.nextTick()
    assert.equal(page.currentPage.value, 1)
    assert.deepEqual(page.paginatedItems.value.map(item => item.id), ['item-1'])
    page.toggleSelectAll({ target: { checked: true } })
    assert.deepEqual(page.selected.value, ['item-1'])
    props.items = []
    await vue.nextTick()
    assert.deepEqual(page.selected.value, [])
})

async function folderPage(options = {}) {
    const folder = vue.ref({ id: 'root', name: 'Project', totalSize: '0', parent: null, items: [], counts: { files: 0, folders: 0, notes: 0 }, share: sharing })
    const routes = []
    const calls = [], toasts = [], destinations = []
    const fetchError = vue.ref(null)
    let refreshes = 0
    const noActions = { isUploading: vue.ref(false), isProcessing: vue.ref(false), uploadProgress: vue.ref(null), isLoading: vue.ref(false) }
    const env = {
        ...vueGlobals, formatFileSize, formatFileTime, getFileReturnPage, getDroppedUploadItems,
        definePageMeta() {}, useDetailsHeader() {}, useUnsavedChanges() {},
        useRoute: () => ({ params: { folderId: 'root' }, query: {}, fullPath: '/folders/root' }),
        useRouter: () => ({ push: async value => routes.push(value) }),
        useFetch: async () => ({ data: folder, pending: vue.ref(false), error: fetchError, refresh: async () => {
            refreshes++
            if (options.refreshError) fetchError.value = new Error('Refresh failed')
        } }),
        useFileActions: destination => {
            destinations.push(destination)
            return { ...noActions, uploadFiles: async files => {
                calls.push(['files', files])
                await options.uploadFiles?.(files)
            } }
        },
        useFolderActions: () => ({ ...noActions, uploadFolders: async (files, callback, destination) => {
            calls.push(['folders', files, destination])
            await options.uploadFolders?.(files)
        } }),
        useFileDrop: () => ({ isDragging: vue.ref(false), dragenter() {}, dragover() {}, dragleave() {}, drop() {} }),
        useNoteActions: () => ({}),
        useFavoriteActions: () => ({}), useUser: () => ({ folders: vue.ref([]), favorites: vue.ref([]), fetchFavorites: async () => {} }),
        useToast: () => ({ openToast: (...args) => toasts.push(args) }),
        useTrashActions: () => ({ notifyTrashed() {} })
    }
    const page = await executable(parse(read('app/pages/(user)/folders/[folderId].vue')).descriptor.scriptSetup.content, env)
    return { page, calls, toasts, routes, destinations, get refreshes() { return refreshes } }
}

test('folder navigation opens the matching detail type with its source path', async () => {
    const f = await folderPage()
    for (const type of ['folder', 'note', 'file']) await f.page.openItem({ id: type + '-id', type })
    assert.deepEqual(f.routes.map(route => route.path), ['/folders/folder-id', '/notes/note-id', '/files/file-id'])
    assert.ok(f.routes.every(route => route.query.from === '/folders/root'))
})

const droppedFile = name => new File(['content'], name)
const mixedDrop = () => {
    const loose = droppedFile('readme.txt')
    const nested = droppedFile('nested.txt')
    const folder = { isDirectory: true, isFile: false, name: 'Notes', createReader: () => {
        let done = false
        return { readEntries: callback => {
            callback(done ? [] : [{ isFile: true, name: nested.name, file: resolve => resolve(nested) }])
            done = true
        } }
    } }
    return { dataTransfer: { files: [loose], items: [
        { kind: 'file', getAsFile: () => loose },
        { kind: 'file', webkitGetAsEntry: () => folder }
    ] } }
}

test('dropping files and a folder uploads both into the current folder and refreshes once', async () => {
    const f = await folderPage()
    await f.page.handleDrop(mixedDrop())
    assert.deepEqual(f.destinations, ['root'])
    assert.equal(f.calls[0][0], 'files')
    assert.equal(f.calls[0][1][0].name, 'readme.txt')
    assert.equal(f.calls[1][0], 'folders')
    assert.equal(f.calls[1][1][0].webkitRelativePath, 'Notes/nested.txt')
    assert.equal(f.calls[1][2], 'root')
    assert.equal(f.refreshes, 1)
    assert.equal(f.page.busy.value, false)
    assert.deepEqual(f.toasts.map(toast => toast[1]), ['success'])
})

test('drops batch more than six files and ignore a repeated drop until the upload finishes', async () => {
    let finish
    const f = await folderPage({ uploadFiles: () => new Promise(resolve => { finish = resolve }) })
    const event = { dataTransfer: { files: Array.from({ length: 7 }, (_, i) => droppedFile(`${i}.txt`)), items: [] } }
    const request = f.page.handleDrop(event)
    await vue.nextTick()
    assert.equal(f.page.busy.value, true)
    await f.page.handleDrop(event)
    assert.equal(f.calls.length, 1)
    finish()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(f.calls.length, 2)
    assert.deepEqual(f.calls.map(call => call[1].length), [6, 1])
    finish()
    await request
    assert.equal(f.refreshes, 1)
    assert.equal(f.page.busy.value, false)
})

test('a failed file upload does not prevent dropped folders from uploading or hide the error', async () => {
    const f = await folderPage({ uploadFiles: async () => { throw new Error('File already exists') } })
    await f.page.handleDrop(mixedDrop())
    assert.equal(f.calls.length, 2)
    assert.equal(f.refreshes, 1)
    assert.ok(f.toasts.some(([message, type]) => type === 'error' && message === 'File already exists'))
    assert.ok(f.toasts.some(([, type]) => type === 'success'))
    assert.equal(f.page.busy.value, false)
})

test('a refresh failure after a successful drop reports the refresh error without re-uploading', async () => {
    const f = await folderPage({ refreshError: true })
    await f.page.handleDrop(mixedDrop())
    assert.equal(f.calls.length, 2)
    assert.equal(f.refreshes, 1)
    assert.ok(f.toasts.some(([message, type]) => type === 'error' && message.includes('could not be refreshed')))
    assert.equal(f.page.busy.value, false)
})

test('unreadable or empty dropped folders do not start uploads or leave the folder busy', async () => {
    const f = await folderPage()
    const entry = { isFile: true, file: (_resolve, reject) => reject(new Error('Cannot read file')) }
    await f.page.handleDrop({ dataTransfer: { files: [], items: [{ kind: 'file', webkitGetAsEntry: () => entry }] } })
    assert.equal(f.toasts[0][0], 'Cannot read file')
    await f.page.handleDrop({ dataTransfer: { files: [], items: [] } })
    assert.equal(f.calls.length, 0)
    assert.equal(f.refreshes, 0)
    assert.equal(f.page.busy.value, false)
})

test('unsaved navigation and tab-close warnings protect dirty notes and pending saves', async () => {
    let routeGuard, unload
    let discard = false
    const prompts = []
    const env = {
        onBeforeRouteLeave: fn => { routeGuard = fn },
        useEventListener: (_, fn) => { unload = fn },
        useConfirm: () => ({ confirm: async options => { prompts.push(options); return discard } })
    }
    const result = await executable(read('app/composables/ui/useUnsavedChanges.ts'), env)
    const dirty = vue.ref(true), saving = vue.ref(false)
    result.useUnsavedChanges(dirty, saving)
    assert.equal(await routeGuard(), false)
    assert.equal(prompts[0].cancelText, 'Keep editing')
    assert.equal(prompts[0].variant, 'neutral')
    let prevented = false
    unload({ preventDefault: () => { prevented = true }, returnValue: null })
    assert.equal(prevented, true)
    dirty.value = false
    assert.equal(await routeGuard(), true)
    saving.value = true
    assert.equal(await routeGuard(), false)
    saving.value = false
    dirty.value = true
    discard = true
    assert.equal(await routeGuard(), true)
})

test('unsaved navigation remains blocked when a save starts while the dialog is open', async () => {
    let routeGuard, resolve
    const result = await executable(read('app/composables/ui/useUnsavedChanges.ts'), {
        onBeforeRouteLeave: guard => { routeGuard = guard }, useEventListener: () => {},
        useConfirm: () => ({ confirm: () => new Promise(done => { resolve = done }) })
    })
    const dirty = vue.ref(true), saving = vue.ref(false)
    result.useUnsavedChanges(dirty, saving)
    const navigation = routeGuard()
    saving.value = true
    resolve(true)
    assert.equal(await navigation, false)
})

test('all new detail, folder and sharing templates compile with Vue', () => {
    for (const file of [
        'app/pages/(user)/notes/[noteId].vue',
        'app/pages/(user)/folders/[folderId].vue',
        'app/components/ui/DetailsWorkspace.vue',
        'app/components/ui/FolderBrowser.vue',
        'app/components/ui/SharedFolderContents.vue',
        'app/components/ui/Toast.vue',
        'app/components/ui/ConfirmModal.vue',
        'app/app.vue',
        'app/pages/(user)/favorites/index.vue'
    ]) {
        const { descriptor, errors } = parse(read(file))
        assert.deepEqual(errors, [])
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: file }).errors, [])
    }
})
