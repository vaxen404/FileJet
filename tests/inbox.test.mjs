import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseFileRequest, assertRequestOpen, validateRequestFiles, availableRequestFilename, parseInboxReviewIds } from '../server/utils/inboxValidation.ts'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createError } from 'h3'
import { getFileReturnPage } from '../app/utils/fileNavigation.ts'
import { getInboxPreview, inboxPreviewRange } from '../shared/utils/inboxPreview.ts'
import * as vue from 'vue'

const rejects = (fn, status) => assert.throws(fn, error => error.statusCode === status)
const openRequest = { is_open: true, expires_at: null, received_count: 0, max_files: 3 }

test('file requests validate titles, destinations, expiration and bounded limits', () => {
    assert.deepEqual(parseFileRequest({ title: ' Documents ' }), { title: 'Documents', description: '', folderId: null, expiresAt: null, maxFileSize: 10485760, maxFiles: 100 })
    for (const body of [{ title: '' }, { title: 'x'.repeat(121) }, { title: 'x', description: 'x'.repeat(1001) }, { title: 'x', folderId: '../other' }, { title: 'x', maxFileSize: 26214401 }, { title: 'x', maxFileSize: '100' }, { title: 'x', maxFiles: 0 }, { title: 'x', maxFiles: 1.5 }, { title: 'x', maxFiles: 1001 }, { title: 'x', expiresAt: 'invalid' }, { title: 'x', expiresAt: '2000-01-01' }]) rejects(() => parseFileRequest(body), 400)
})

test('editing an expired inbox can preserve its date without silently reopening the link', () => {
    const past = '2020-01-01T00:00:00.000Z'
    rejects(() => parseFileRequest({ title: 'Edit', expiresAt: past }), 400)
    assert.equal(parseFileRequest({ title: 'Edit', expiresAt: past }, Date.now(), true).expiresAt.toISOString(), past)
    rejects(() => parseFileRequest({ title: 'Edit', expiresAt: 'invalid' }, Date.now(), true), 400)
})

test('closed, expired and full requests reject uploads, including multi-file overflow', () => {
    assert.doesNotThrow(() => assertRequestOpen(openRequest, 3))
    rejects(() => assertRequestOpen({ ...openRequest, is_open: false }), 410)
    rejects(() => assertRequestOpen({ ...openRequest, expires_at: new Date(0) }), 410)
    rejects(() => assertRequestOpen({ ...openRequest, received_count: 3 }), 410)
    rejects(() => assertRequestOpen({ ...openRequest, received_count: 2 }, 2), 410)
})

test('anonymous uploads enforce batch, filename and per-file bounds', () => {
    const file = { filename: 'hello.txt', data: Buffer.from('hello') }
    assert.equal(validateRequestFiles([file], 5), 5n)
    rejects(() => validateRequestFiles([], 5), 400)
    rejects(() => validateRequestFiles(Array(7).fill(file), 5), 400)
    rejects(() => validateRequestFiles([file], 4), 413)
    for (const filename of ['..', '.', '../x', 'x\\y', 'x\0y', 'x\ny', 'é'.repeat(128)]) rejects(() => validateRequestFiles([{ ...file, filename }], 5), 400)
    rejects(() => validateRequestFiles(Array.from({ length: 3 }, () => ({ filename: 'x', data: Buffer.alloc(18 * 1024 * 1024) })), 25 * 1024 * 1024), 413)
})

test('incoming duplicate names preserve existing files and fit UTF-8 database limits', () => {
    const names = new Set(['report.pdf', 'report (1).pdf'])
    assert.equal(availableRequestFilename('Report.pdf', names), 'Report (2).pdf')
    assert.equal(availableRequestFilename('new.txt', names), 'new.txt')
    assert.equal(availableRequestFilename('.env', new Set(['.env'])), '.env (1)')
    const long = '😀'.repeat(62) + '.txt'
    const next = availableRequestFilename(long, new Set([long]))
    assert.ok(Buffer.byteLength(next) <= 255)
    assert.ok(next.endsWith(' (1).txt'))
    assert.ok(!next.includes('\ufffd'))
})

function inboxDetailFixture(userId, id) {
    const requests = [
        { id: 'first', user_id: 'owner', title: 'First inbox', folder_id: null },
        { id: 'second', user_id: 'owner', title: 'Second inbox', folder_id: null },
        { id: 'foreign', user_id: 'other', title: 'Other account', folder_id: null }
    ]
    const rows = requests.flatMap(request => Array.from({ length: 225 }, (_,index) => ({
        id: `${request.id}-${index}`, request_id: request.id, file_id: null, name: `${request.id}-${index}.txt`,
        sender_name: 'Sender', size: 12n, created_at: new Date('2026-10-31T00:00:00Z')
    })))
    let uploadReads = 0
    const prisma = {
        file_requests: { findFirst: async ({ where }) => requests.find(row => row.id === where.id && row.user_id === where.user_id) ?? null },
        request_uploads: { findMany: async ({ where, take }) => {
            uploadReads++
            return rows.filter(row => row.request_id === where.request_id && requests.find(request => request.id === row.request_id)?.user_id === where.request.user_id).slice(0,take)
        } }
    }
    const imports = {
        '../../utils/prisma': { prisma },
        '../../utils/inbox': {
            inboxOwner: () => { if (!userId) throw createError({ statusCode: 401 }); return userId },
            inboxParam: () => id,
            fileRequestView: (_, item) => ({ id: item.id, title: item.title })
        },
        '../../utils/error': { throwError: (statusCode, message) => { throw createError({ statusCode, message }) } }
    }
    const source = readFileSync(new URL('../server/api/inbox/[id].get.ts', import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', 'defineEventHandler', code)(name => { assert.ok(imports[name], name); return imports[name] }, module, module.exports, handler => handler)
    return { run: () => module.exports.default({}), get uploadReads() { return uploadReads } }
}

test('opening an inbox returns only its own submissions, including those older than the former global 200-file limit', async () => {
    const result = await inboxDetailFixture('owner', 'first').run()
    assert.equal(result.request.title, 'First inbox')
    assert.equal(result.uploads.length, 225)
    assert.ok(result.uploads.every(file => file.requestId === 'first' && file.name.startsWith('first-') && file.size === '12'))
    assert.doesNotThrow(() => JSON.stringify(result))
})

test('inbox details reject anonymous, foreign and missing requests before reading submissions', async () => {
    for (const [owner, id, status] of [[null, 'first', 401], ['other', 'first', 404], ['owner', 'missing', 404]]) {
        const fixture = inboxDetailFixture(owner, id)
        await assert.rejects(fixture.run, error => error.statusCode === status)
        assert.equal(fixture.uploadReads, 0)
    }
})

test('file previews can return to the inbox they came from without accepting external destinations', () => {
    const path = '/inbox/12345678-1234-1234-1234-123456789abc'
    assert.deepEqual(getFileReturnPage(path), { path, name: 'Inbox' })
    for (const value of ['https://example.com' + path, '//example.com' + path, '/inbox/not-an-id', '/inbox/../../evil']) assert.equal(getFileReturnPage(value), null)
})

function reviewFixture(count = 1) {
    const state = { used: BigInt(3 * count), files: [{ id: 'existing', original_name: 'report.txt' }], missing: false, missingKey: null,
        upload: { id: 'upload', request_id: 'inbox', status: 'pending', storage_key: 'owner/pending', name: 'report.txt', size: 3n, mime_type: 'text/plain', file_id: null } }
    state.uploads = Array.from({ length: count }, (_, index) => index ? { ...state.upload, id: `upload-${index + 1}`, storage_key: `owner/pending-${index + 1}` } : state.upload)
    const request = { id: 'inbox', user_id: 'owner', folder_id: null }
    const quotaChanges = []
    const tx = {
        $queryRaw: async (sql, id, owner) => {
            if (sql.join('').includes('FROM file_requests')) return id === 'inbox' && owner === 'owner' ? [{ id }] : []
            return id === 'destination' && owner === 'owner' ? [{ id }] : []
        },
        file_requests: { findFirst: async ({ where }) => where.id === request.id && where.user_id === request.user_id ? request : null },
        request_uploads: {
            findFirst: async ({ where }) => { const upload = state.uploads.find(row => row.id === where.id && where.request_id === 'inbox' && where.request.user_id === 'owner'); return upload ? { ...upload } : null },
            findMany: async ({ where }) => state.uploads.filter(row => where.id.in.includes(row.id) && where.request_id === 'inbox' && where.request.user_id === 'owner').map(row => ({ ...row })),
            update: async ({ where, data }) => Object.assign(state.uploads.find(row => row.id === where.id), data),
            updateMany: async ({ where, data }) => { const rows = state.uploads.filter(row => where.id.in.includes(row.id) && row.request_id === where.request_id && row.status === where.status); rows.forEach(row => Object.assign(row, data)); return { count: rows.length } }
        },
        files: { findMany: async () => state.files, create: async ({ data }) => { const file = { ...data, id: state.files.length === 1 ? 'approved' : `approved-${state.files.length}` }; state.files.push(file); return file } }
    }
    const imports = {
        'node:fs/promises': { stat: async path => ({ isFile: () => !state.missing && path !== state.missingKey, size: 3 }), unlink: async () => {} },
        './storage': { lockStorageUser: async () => {}, reserveStorage: async (_, userId, amount) => { assert.equal(userId, 'owner'); quotaChanges.push(amount); state.used += amount } },
        './files': { storagePath: key => '/fixture/' + key },
        './inboxValidation': { availableRequestFilename },
        './error': { throwError: (statusCode, message) => { throw createError({ statusCode, message }) } }
    }
    const source = readFileSync(new URL('../server/utils/inboxReview.ts', import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(name => { assert.ok(imports[name], name); return imports[name] }, module, module.exports)
    return { state, tx, quotaChanges, ...module.exports }
}

test('approval creates a library file only after explicit review, resolves names, and never charges storage twice', async () => {
    const f = reviewFixture()
    assert.equal(f.state.files.length, 1)
    const result = await f.approveInboxUpload(f.tx, 'owner', 'inbox', 'upload', null)
    assert.deepEqual(result, { fileId: 'approved', name: 'report (1).txt' })
    assert.equal(f.state.files.at(-1).folder_id, null)
    assert.equal(f.state.files.at(-1).storage_key, 'owner/pending')
    assert.equal(f.state.upload.status, 'approved')
    assert.equal(f.state.upload.storage_key, null)
    assert.equal(f.state.used, 3n)
    assert.deepEqual(f.quotaChanges, [])
    await assert.rejects(() => f.approveInboxUpload(f.tx, 'owner', 'inbox', 'upload', null), { statusCode: 409 })
    assert.equal(f.state.files.length, 2)
})

test('approval requires the owner, matching inbox/upload, owned destination and stored content before saving', async () => {
    for (const [owner, inbox, upload, folder, status] of [
        ['other', 'inbox', 'upload', null, 404], ['owner', 'different', 'upload', null, 404],
        ['owner', 'inbox', 'foreign-upload', null, 404], ['owner', 'inbox', 'upload', 'foreign-folder', 404]
    ]) {
        const f = reviewFixture()
        await assert.rejects(() => f.approveInboxUpload(f.tx, owner, inbox, upload, folder), { statusCode: status })
        assert.equal(f.state.files.length, 1); assert.equal(f.state.upload.status, 'pending'); assert.equal(f.state.used, 3n)
    }
    const missing = reviewFixture(); missing.state.missing = true
    await assert.rejects(() => missing.approveInboxUpload(missing.tx, 'owner', 'inbox', 'upload', null), { statusCode: 409 })
    assert.equal(missing.state.files.length, 1)
    const folder = reviewFixture()
    await folder.approveInboxUpload(folder.tx, 'owner', 'inbox', 'upload', 'destination')
    assert.equal(folder.state.files.at(-1).folder_id, 'destination')
})

test('rejection releases pending quota once, returns the file for cleanup, and cannot delete approved files', async () => {
    const f = reviewFixture()
    assert.equal(await f.rejectInboxUpload(f.tx, 'owner', 'inbox', 'upload'), 'owner/pending')
    assert.equal(f.state.upload.status, 'rejected'); assert.equal(f.state.upload.storage_key, null)
    assert.equal(f.state.used, 0n); assert.equal(f.state.files.length, 1)
    await assert.rejects(() => f.rejectInboxUpload(f.tx, 'owner', 'inbox', 'upload'), { statusCode: 409 })
    assert.deepEqual(f.quotaChanges, [-3n])
    const approved = reviewFixture()
    await approved.approveInboxUpload(approved.tx, 'owner', 'inbox', 'upload', null)
    await assert.rejects(() => approved.rejectInboxUpload(approved.tx, 'owner', 'inbox', 'upload'), { statusCode: 409 })
    assert.equal(approved.state.files.length, 2); assert.equal(approved.state.used, 3n)
})

test('bulk review validates bounded UUID lists and deduplicates repeated selections', () => {
    const first = '12345678-1234-4234-8234-123456789abc', second = '22345678-1234-4234-8234-123456789abc'
    assert.deepEqual(parseInboxReviewIds([first, second, first]), [first, second])
    for (const value of [null, [], 'all', [first, '../other'], [42], Array(1001).fill(first)]) rejects(() => parseInboxReviewIds(value), 400)
    assert.equal(parseInboxReviewIds(Array(1000).fill(first)).length, 1)
})

test('bulk approval preserves quota and resolves same-name files within the selected group', async () => {
    const f = reviewFixture(3), ids = f.state.uploads.map(upload => upload.id)
    const result = await f.approveInboxUploads(f.tx, 'owner', 'inbox', ids, 'destination')
    assert.equal(result.approvedCount, 3)
    assert.deepEqual(result.files.map(file => file.name), ['report (1).txt', 'report (2).txt', 'report (3).txt'])
    assert.ok(f.state.files.slice(1).every(file => file.folder_id === 'destination'))
    assert.ok(f.state.uploads.every(upload => upload.status === 'approved' && upload.storage_key === null))
    assert.equal(f.state.used, 9n); assert.deepEqual(f.quotaChanges, [])
    await assert.rejects(() => f.approveInboxUploads(f.tx, 'owner', 'inbox', ids, null), { statusCode: 409 })
    assert.equal(f.state.files.length, 4)
})

test('bulk review checks every selected file and stored content before changing the group', async () => {
    for (const action of ['approveInboxUploads', 'rejectInboxUploads']) {
        const f = reviewFixture(3), ids = [...f.state.uploads.map(upload => upload.id), 'foreign-upload']
        await assert.rejects(() => f[action](f.tx, 'owner', 'inbox', ids, null), { statusCode: 404 })
        assert.ok(f.state.uploads.every(upload => upload.status === 'pending')); assert.equal(f.state.files.length, 1); assert.equal(f.state.used, 9n)
        f.state.uploads[1].status = 'approved'
        await assert.rejects(() => f[action](f.tx, 'owner', 'inbox', ids.slice(0, 3), null), { statusCode: 409 })
        assert.equal(f.state.upload.status, 'pending'); assert.equal(f.state.used, 9n)
    }
    const missing = reviewFixture(3)
    missing.state.missingKey = '/fixture/owner/pending-3'
    await assert.rejects(() => missing.approveInboxUploads(missing.tx, 'owner', 'inbox', missing.state.uploads.map(upload => upload.id), null), { statusCode: 409 })
    assert.equal(missing.state.files.length, 1)
    assert.ok(missing.state.uploads.every(upload => upload.status === 'pending'))
    const foreign = reviewFixture(2)
    await assert.rejects(() => foreign.approveInboxUploads(foreign.tx, 'other', 'inbox', ['upload', 'upload-2'], null), { statusCode: 404 })
    await assert.rejects(() => foreign.approveInboxUploads(foreign.tx, 'owner', 'inbox', ['upload', 'upload-2'], 'foreign-folder'), { statusCode: 404 })
    assert.equal(foreign.state.files.length, 1)
})

test('bulk rejection releases the selected bytes once and preserves unselected pending files', async () => {
    const f = reviewFixture(3)
    const result = await f.rejectInboxUploads(f.tx, 'owner', 'inbox', ['upload', 'upload-3'])
    assert.deepEqual(result, { rejectedCount: 2, keys: ['owner/pending', 'owner/pending-3'] })
    assert.equal(f.state.used, 3n); assert.equal(f.state.uploads[1].status, 'pending')
    assert.equal(f.state.files.length, 1); assert.deepEqual(f.quotaChanges, [-6n])
    await assert.rejects(() => f.rejectInboxUploads(f.tx, 'owner', 'inbox', ['upload', 'upload-3']), { statusCode: 409 })
    assert.equal(f.state.used, 3n)
})

test('Inbox previews classify media and treat HTML, SVG and code as plain text', () => {
    for (const [name, mime, kind] of [['a.png','image/png','image'],['a.pdf','application/pdf','pdf'],['a.mp4','video/mp4','video'],['a.wav','audio/wav','audio'],['a.txt',null,'text'],['a.json','application/json','text'],['a.html','text/html','text'],['a.svg','image/svg+xml','text'],['a.ts','application/octet-stream','text'],['a.zip','application/zip','unsupported'],['a.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','unsupported']]) {
        assert.equal(getInboxPreview(name,mime).kind,kind)
        if(kind === 'text') assert.equal(getInboxPreview(name,mime).contentType,'text/plain; charset=utf-8')
    }
})

test('preview byte ranges support seeking and reject malformed, excessive and empty-file ranges', () => {
    assert.deepEqual(inboxPreviewRange('bytes=0-4',10),{start:0,end:4})
    assert.deepEqual(inboxPreviewRange('bytes=5-',10),{start:5,end:9})
    assert.deepEqual(inboxPreviewRange('bytes=-3',10),{start:7,end:9})
    assert.deepEqual(inboxPreviewRange('bytes=0-100',10),{start:0,end:9})
    for(const value of ['bytes=-0','bytes=10-','bytes=5-2','bytes=','bytes=0-2,4-5','bytes=9007199254740992-','items=0-2']) assert.equal(inboxPreviewRange(value,10),null)
    assert.equal(inboxPreviewRange('bytes=0-',0),null)
})

function previewFixture(options = {}) {
    const headers = {}, calls = [], event = {}
    let status = 200
    const upload = { id:'upload',request_id:'inbox',owner:'owner',status:options.status ?? 'pending',name:options.name ?? 'hello.txt',mime_type:options.mime ?? 'text/plain',storage_key:'owner/pending' }
    const imports = {
        'node:fs': { createReadStream: (path, range) => ({path,range}) },
        'node:fs/promises': { stat: async () => ({isFile:()=>!options.missing,size:options.size ?? 5}) },
        '../../../../../utils/prisma': { prisma: { request_uploads: { findFirst: async ({where}) => {
            calls.push(where)
            return where.id===upload.id && where.request_id===upload.request_id && where.request.user_id===upload.owner && where.status===upload.status ? upload : null
        } } } },
        '../../../../../utils/inbox': { inboxOwner: () => {if(options.anonymous)throw createError({statusCode:401});return options.owner??'owner'},inboxParam:(_,name)=>name==='id'?(options.inbox??'inbox'):'upload' },
        '../../../../../utils/files': { storagePath:key=>'/fixture/'+key },
        '../../../../../utils/error': { throwError:(statusCode,message)=>{throw createError({statusCode,message})} },
        '~~/shared/utils/inboxPreview': { getInboxPreview, inboxPreviewRange }
    }
    const source=readFileSync(new URL('../server/api/inbox/[id]/uploads/[uploadId]/preview.get.ts',import.meta.url),'utf8')
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const module={exports:{}}
    new Function('require','module','exports','defineEventHandler','enforceRateLimit','setHeader','getHeader','setResponseStatus','sendStream',code)(
        name=>{assert.ok(imports[name],name);return imports[name]},module,module.exports,handler=>handler,()=>{},(_,key,value)=>{headers[key]=value},()=>options.range,(_,value)=>{status=value},(_,stream)=>stream
    )
    return {run:()=>module.exports.default(event),headers,calls,get status(){return status}}
}

test('pending preview is owner-only and unavailable after approval, rejection or file removal', async () => {
    for(const options of [{anonymous:true},{owner:'other'},{inbox:'different'},{status:'approved'},{status:'rejected'},{missing:true}]) {
        const fixture=previewFixture(options)
        await assert.rejects(fixture.run,{statusCode:options.anonymous?401:404})
    }
})

test('pending previews are inline, bounded and sandboxed without saving or automatically downloading', async () => {
    const text=previewFixture({size:2*1024*1024,mime:'text/html',name:'page.html'})
    const response=await text.run()
    assert.equal(text.headers['Content-Type'],'text/plain; charset=utf-8')
    assert.ok(text.headers['Content-Disposition'].startsWith('inline;'))
    assert.ok(text.headers['Content-Security-Policy'].includes('sandbox'))
    assert.equal(text.headers['X-Content-Type-Options'],'nosniff')
    assert.equal(text.headers['X-Preview-Truncated'],'true')
    assert.deepEqual(response.range,{start:0,end:1048575})
    const media=previewFixture({mime:'video/mp4',name:'clip.mp4',size:100,range:'bytes=20-39'})
    assert.deepEqual((await media.run()).range,{start:20,end:39})
    assert.equal(media.status,206);assert.equal(media.headers['Content-Range'],'bytes 20-39/100')
    const invalid=previewFixture({mime:'application/pdf',size:100,range:'bytes=101-'})
    assert.equal(await invalid.run(),'');assert.equal(invalid.status,416)
    await assert.rejects(previewFixture({mime:'application/zip',name:'archive.zip'}).run,{statusCode:415})
})

test('Inbox destinations use the Folders-page root list and display names without nested paths', async () => {
    const roots = ['server', 'Baltaş', 'deneme', 'javascript'].map((name, index) => ({ id: `root-${index}`, name, parent_folder_id: null }))
    const calls = []
    const source = readFileSync(new URL('../app/composables/ui/useInboxFolders.ts', import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    new Function('module', 'exports', 'ref', 'computed', '$fetch', code)(module, module.exports, vue.ref, vue.computed, async url => { calls.push(url); return { folders: roots } })
    const folders = module.exports.useInboxFolders()
    await folders.loadFolders()
    assert.deepEqual(calls, ['/api/folders'])
    assert.deepEqual(folders.folderOptions.value, roots.map(folder => ({ id: folder.id, label: folder.name })))
    assert.equal(folders.loadingFolders.value, false)
    assert.equal(folders.folderError.value, '')
})
