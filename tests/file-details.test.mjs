import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { ref, computed, watch, nextTick } from 'vue'
import { canCopyFile, getFileIcon, getFileType, formatFileSize, formatFileTime } from '../app/utils/file.ts'
import { getFileReturnPage } from '../app/utils/fileNavigation.ts'
import { emptyShareState } from '../shared/types/share.ts'

const source = readFileSync(new URL('../app/pages/(user)/files/[id].vue', import.meta.url), 'utf8')
const descriptor = parse(source).descriptor
const script = ts.createSourceFile('file-details.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest)
const withoutImports = ts.factory.updateSourceFile(script, script.statements.filter(statement => !ts.isImportDeclaration(statement)))
const code = ts.transpileModule(ts.createPrinter().printFile(withoutImports), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

const initialFile = {
    id: 'file-1', user_id: 'user-1', folder_id: null,
    name: 'clip.mp4', original_name: 'clip.mp4', mime_type: 'video/mp4',
    size: '1677721', storage_key: 'uploads/clip',
    created_at: '2026-10-11T12:14:00.000Z', updated_at: '2026-10-11T12:14:00.000Z'
}

async function setup(options = {}) {
    const file = ref({ ...initialFile, ...options.file })
    const listedFiles = ref([{ ...file.value }])
    const favorites = ref([])
    const calls = []
    const toasts = []
    const pushes = []
    const actions = {
        isDeleting: ref(false),
        renameFile: async (id, name) => {
            calls.push(['rename', id, name])
            if (options.rename) return options.rename(id, name)
            return {
                success: true,
                file: { ...file.value, name, original_name: `${name}.mp4`, updated_at: '2026-10-17T12:00:00.000Z' }
            }
        },
        downloadFile: async id => { calls.push(['download', id]) },
        copyFile: async item => { calls.push(['copy', item.id]) },
        deleteFile: async id => { calls.push(['delete', id]) }
    }
    const env = {
        ref, computed, watch, nextTick, onMounted: () => {}, onBeforeUnmount: () => {},
        useFileHeader: () => ref(null), emptyShareState,
        canCopyFile, getFileIcon, getFileType, formatFileSize, formatFileTime, getFileReturnPage,
        definePageMeta: () => {},
        useRoute: () => ({ params: { id: 'file-1' }, query: { from: options.from } }),
        useRouter: () => ({ push: async path => { pushes.push(path) } }),
        useFetch: async () => ({ data: file, refresh: async () => {} }),
        useFileActions: () => actions,
        useFavoriteActions: () => ({
            addFavorite: async id => { calls.push(['favorite', id]); favorites.value.push({ file_id: id }) },
            removeFavorite: async id => { calls.push(['unfavorite', id]); favorites.value = [] }
        }),
        useUser: () => ({
            files: listedFiles,
            folders: ref(options.folders ?? []),
            favorites,
            fetchAll: async () => { calls.push(['refresh-user']) }
        }),
        useToast: () => ({ openToast: (...args) => { toasts.push(args) } }),
        $fetch: async () => {
            if (options.previewError) throw new Error('Preview unavailable')
            return options.text ?? 'Example text'
        },
        document: { getElementById: () => ({ focus: () => {} }) }
    }
    const exposed = [
        'activeTab', 'editingFileName', 'renameError', 'isSavingRename', 'canSaveRename', 'displayFileName',
        'startRename', 'selectTab', 'cancelRename', 'saveRename', 'handleTabKeydown',
        'handleDownload', 'handleDelete', 'handleFavorite', 'handleCopy', 'isFileFavorite',
        'metadataRows', 'captureImageMetadata', 'captureVideoMetadata', 'handlePreviewError',
        'previewError', 'textContent', 'canCopy', 'isImage', 'isVideo', 'isText', 'isPdf', 'goBack',
        'imagePreview', 'videoPreview'
    ]
    const run = new AsyncFunction(...Object.keys(env), `${code}\nreturn { ${exposed.join(', ')} }`)
    return { page: await run(...Object.values(env)), file, listedFiles, calls, toasts, pushes }
}

test('details is the default tab; edit and cancel never send a rename request', async () => {
    const { page, calls, file } = await setup()
    assert.equal(page.activeTab.value, 'details')
    await page.selectTab('edit')
    assert.equal(page.activeTab.value, 'edit')
    page.editingFileName.value = 'Unsaved draft'
    await page.selectTab('details')
    await page.selectTab('edit')
    assert.equal(page.editingFileName.value, 'Unsaved draft')
    page.cancelRename()
    assert.equal(page.activeTab.value, 'details')
    assert.equal(page.editingFileName.value, 'clip')
    assert.deepEqual(calls, [])
})

test('details retain dimensions, duration and FPS while omitting discarded technical fields for all media types', async () => {
    const technical_metadata = {
        width: 1920, height: 1080, duration: 75, fps: 29.97, format: 'mov,mp4',
        videoCodec: 'h264', audioCodec: 'aac', bitrate: 1200000, channels: 2, sampleRate: 44100
    }
    for (const mime_type of ['video/mp4', 'image/png', 'audio/mpeg']) {
        const { page } = await setup({ file: { mime_type, technical_metadata } })
        const rows = page.metadataRows.value
        assert.ok(rows.some(row => row.label === 'Full filename'))
        assert.ok(!rows.some(row => /codec|bitrate|channels|sample rate/i.test(row.label)))
        if (mime_type.startsWith('video/')) {
            assert.equal(rows.find(row => row.label === 'Resolution').value, '1920 × 1080')
            assert.equal(rows.find(row => row.label === 'Duration').value, '1:15')
            assert.equal(rows.find(row => row.label === 'FPS').value, '29.97 fps')
        }
        if (mime_type.startsWith('audio/')) assert.equal(rows.find(row => row.label === 'Duration').value, '1:15')
    }
})

test('save applies the actual API response to the heading data, metadata and shared file list', async () => {
    const { page, file, listedFiles, calls, toasts } = await setup()
    await page.startRename()
    page.editingFileName.value = '  New clip  '
    await page.saveRename()
    assert.deepEqual(calls, [['rename', 'file-1', 'New clip']])
    assert.equal(file.value.name, 'New clip')
    assert.equal(file.value.original_name, 'New clip.mp4')
    assert.equal(page.displayFileName.value, 'New clip.mp4')
    assert.equal(file.value.updated_at, '2026-10-17T12:00:00.000Z')
    assert.deepEqual(listedFiles.value[0], file.value)
    assert.equal(page.activeTab.value, 'details')
    assert.equal(page.isSavingRename.value, false)
    assert.equal(toasts.at(-1)[1], 'success')
})

test('server validation errors keep the draft open and leave the saved file unchanged', async () => {
    const { page, file, toasts } = await setup({
        rename: async () => { throw { data: { message: 'A file with this name already exists.' } } }
    })
    await page.startRename()
    page.editingFileName.value = 'Duplicate'
    await page.saveRename()
    assert.equal(page.activeTab.value, 'edit')
    assert.equal(page.editingFileName.value, 'Duplicate')
    assert.equal(page.renameError.value, 'A file with this name already exists.')
    assert.equal(file.value.name, 'clip.mp4')
    assert.equal(page.isSavingRename.value, false)
    assert.equal(toasts.at(-1)[1], 'error')
})

test('loading prevents duplicate saves and cancellation during an active request', async () => {
    let finish
    const { page, calls } = await setup({ rename: () => new Promise(resolve => { finish = resolve }) })
    await page.startRename()
    page.editingFileName.value = 'Renamed'
    const pending = page.saveRename()
    assert.equal(page.isSavingRename.value, true)
    assert.equal(page.canSaveRename.value, false)
    await page.saveRename()
    page.cancelRename()
    assert.equal(page.activeTab.value, 'edit')
    assert.equal(calls.length, 1)
    finish({ success: true, file: { ...initialFile, name: 'Renamed' } })
    await pending
    assert.equal(page.isSavingRename.value, false)
})

test('empty and unchanged names never reach the API', async () => {
    const { page, calls } = await setup()
    await page.startRename()
    page.editingFileName.value = '   '
    await page.saveRename()
    assert.ok(page.renameError.value)
    page.editingFileName.value = 'clip.mp4'
    await page.saveRename()
    assert.equal(page.activeTab.value, 'details')
    assert.deepEqual(calls, [])
})

test('full filenames are normalized for the existing extension-preserving rename API', async () => {
    const { page, file, calls } = await setup()
    await page.startRename()
    assert.equal(page.editingFileName.value, 'clip')
    page.editingFileName.value = 'Renamed.mp4'
    await page.saveRename()
    assert.deepEqual(calls, [['rename', 'file-1', 'Renamed']])
    assert.equal(file.value.original_name, 'Renamed.mp4')
    assert.equal(page.displayFileName.value, 'Renamed.mp4')
})

test('only real media metadata is displayed and failed previews clear it', async () => {
    const { page } = await setup()
    assert.ok(!page.metadataRows.value.some(row => ['Duration', 'Resolution', 'Codec', 'FPS'].includes(row.label) && row.value !== 'Unavailable'))
    page.captureVideoMetadata({ target: { videoWidth: 576, videoHeight: 1024, duration: 15.9 } })
    assert.ok(page.metadataRows.value.some(row => row.label === 'Resolution' && row.value === '576 × 1024'))
    assert.ok(page.metadataRows.value.some(row => row.label === 'Duration' && row.value === '0:15'))
    page.handlePreviewError()
    assert.ok(!page.metadataRows.value.some(row => ['Duration', 'Resolution'].includes(row.label) && row.value !== 'Unavailable'))
    assert.ok(page.previewError.value)
})

test('missing format, MIME type and dates are not invented', async () => {
    const { page } = await setup({ file: { original_name: 'README', mime_type: null, created_at: null, updated_at: null } })
    assert.equal(page.metadataRows.value.find(row => row.label === 'MIME type').value, 'Unavailable')
    assert.equal(page.metadataRows.value.find(row => row.label === 'Created').value, 'Unavailable')
    assert.equal(page.metadataRows.value.find(row => row.label === 'Extension').value, 'None')
})

test('already loaded media can supply metadata after hydration', async () => {
    const { page } = await setup({ file: { mime_type: 'image/png' } })
    page.imagePreview.value = { naturalWidth: 1920, naturalHeight: 1080 }
    page.captureImageMetadata()
    assert.ok(page.metadataRows.value.some(row => row.label === 'Width' && row.value === '1920'))
    page.videoPreview.value = { videoWidth: 576, videoHeight: 1024, duration: Infinity }
    page.captureVideoMetadata()
    assert.ok(!page.metadataRows.value.some(row => row.label === 'Duration' && row.value !== 'Unavailable'))
})

test('text/image/PDF/video detection, copy support and preview errors remain functional', async () => {
    for (const [mime, flag] of [['image/png', 'isImage'], ['application/pdf', 'isPdf'], ['video/mp4', 'isVideo'], ['text/plain', 'isText']]) {
        const { page } = await setup({ file: { mime_type: mime } })
        assert.equal(page[flag].value, true)
        assert.equal(page.canCopy.value, mime.startsWith('image/') || mime.startsWith('text/'))
    }
    const text = await setup({ file: { mime_type: 'text/plain' }, text: '<script>plain text</script>' })
    assert.equal(text.page.textContent.value, '<script>plain text</script>')
    await text.page.handleCopy()
    assert.deepEqual(text.calls, [['copy', 'file-1']])
    const failed = await setup({ file: { mime_type: 'text/plain' }, previewError: true })
    assert.ok(failed.page.previewError.value)
})

test('download, favorite and delete reuse existing actions and preserve the return route', async () => {
    const { page, calls, pushes } = await setup({ from: '/favorites?view=grid' })
    await page.handleDownload('file-1')
    await page.handleFavorite(initialFile)
    assert.equal(page.isFileFavorite('file-1'), true)
    await page.handleFavorite(initialFile)
    assert.equal(page.isFileFavorite('file-1'), false)
    await page.handleDelete('file-1')
    assert.deepEqual(calls, [
        ['download', 'file-1'], ['favorite', 'file-1'], ['refresh-user'],
        ['unfavorite', 'file-1'], ['refresh-user'], ['delete', 'file-1']
    ])
    assert.deepEqual(pushes, ['/favorites?view=grid'])
    const fallback = await setup({ from: 'https://example.com' })
    await fallback.page.goBack()
    assert.deepEqual(fallback.pushes, ['/files'])
})

test('tabs support keyboard navigation and the template keeps exactly three tabs and one ShareBox', async () => {
    const { page } = await setup()
    let prevented = false
    await page.handleTabKeydown({ key: 'End', preventDefault: () => { prevented = true } })
    assert.equal(prevented, true)
    assert.equal(page.activeTab.value, 'share')
    await page.handleTabKeydown({ key: 'Home', preventDefault: () => {} })
    assert.equal(page.activeTab.value, 'details')
    assert.equal((descriptor.template.content.match(/role="tab"/g) ?? []).length, 3)
    assert.equal((descriptor.template.content.match(/<ShareBox\b/g) ?? []).length, 1)
    assert.ok(!descriptor.template.content.includes('preview-header'))
    assert.ok(!descriptor.template.content.includes('@blur='))
})

test('rename composable preserves its API contract and returns the updated server file', async () => {
    const actionsSource = readFileSync(new URL('../app/composables/actions/useFileActions.ts', import.meta.url), 'utf8')
    const ast = ts.createSourceFile('useFileActions.ts', actionsSource, ts.ScriptTarget.Latest)
    let rename
    const visit = node => {
        if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'renameFile') rename = node.initializer
        ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.ok(rename)
    const expression = ts.createPrinter().printNode(ts.EmitHint.Expression, rename, ast)
    const compiled = ts.transpileModule(`const rename = ${expression}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText
    const response = { success: true, file: { ...initialFile, name: 'Updated' } }
    let loading = 0
    let request
    const create = new Function('$fetch', 'startLoading', 'stopLoading', `${compiled}; return rename`)
    const call = create(async (...args) => { request = args; return response }, () => { loading++ }, () => { loading-- })
    assert.equal(await call('file/id', 'Updated'), response)
    assert.deepEqual(request, ['/api/files/file%2Fid', { method: 'PATCH', body: { newName: 'Updated' } }])
    assert.equal(loading, 0)
    const fail = create(async () => { throw new Error('Validation failed') }, () => { loading++ }, () => { loading-- })
    await assert.rejects(fail('file-1', 'Invalid'), /Validation failed/)
    assert.equal(loading, 0)
})
