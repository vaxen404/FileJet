import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { computed, reactive, ref } from 'vue'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')
const singleRoutes = {
    file: 'server/api/files/[fileId]/index.delete.ts',
    folder: 'server/api/folders/[folderId].delete.ts',
    note: 'server/api/notes/[noteId].delete.ts'
}
const models = { file: 'files', folder: 'folders', note: 'notes' }

function fixture() {
    const owner = randomUUID()
    const otherOwner = randomUUID()
    const state = {
        users: [{ id: owner, storage_used: 1000n }],
        files: [], folders: [], notes: [], favorites: [], trash: [], shared_items: []
    }
    const calls = []
    let failure = null
    let inTransaction = false
    const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
        if (key === 'OR') return value.some(filter => matches(row, filter))
        if (key === 'AND') return value.every(filter => matches(row, filter))
        if (value && typeof value === 'object' && 'in' in value) {
            return value.in.includes(row[key])
        }
        return row[key] === value
    })
    const db = Object.fromEntries(Object.keys(state).map(name => {
        const find = where => state[name].filter(row => matches(row, where))
        const check = operation => {
            assert.ok(inTransaction, `${name}.${operation} must use the transaction client`)
            calls.push(`${name}.${operation}`)
            if (failure?.operation === `${name}.${operation}` && --failure.remaining === 0) {
                throw new Error('Injected database failure')
            }
        }
        const create = data => {
            const row = {
                id: randomUUID(), root_folder_id: null, parent_folder_id: null,
                folder_id: null, ...data
            }
            state[name].push(row)
            return row
        }
        const remove = row => {
            state[name].splice(state[name].indexOf(row), 1)
            if (name !== 'folders') return

            for (const child of [...state.folders]) {
                if (child.parent_folder_id === row.id) remove(child)
            }
            for (const kind of ['files', 'notes']) {
                state[kind] = state[kind].filter(item => item.folder_id !== row.id)
            }
        }
        return [name, {
            findFirst: async ({ where }) => find(where)[0] ?? null,
            findMany: async ({ where }) => find(where),
            create: async ({ data }) => { check('create'); return create(data) },
            createMany: async ({ data }) => {
                check('createMany')
                data.forEach(create)
                return { count: data.length }
            },
            delete: async ({ where }) => {
                check('delete')
                const row = find(where)[0]
                assert.ok(row)
                remove(row)
                return row
            },
            deleteMany: async ({ where }) => {
                check('deleteMany')
                const rows = find(where)
                rows.forEach(remove)
                return { count: rows.length }
            }
        }]
    }))
    db.$queryRaw = async (_sql, userId) => state.users.filter(user => user.id === userId)
    db.$transaction = async work => {
        const before = structuredClone(state)
        inTransaction = true
        try {
            return await work(db)
        } catch (error) {
            Object.assign(state, before)
            throw error
        } finally {
            inTransaction = false
        }
    }
    const cache = new Map()
    function load(path) {
        const filename = resolve(root, path)
        if (filename === resolve(root, 'server/utils/prisma.ts')) return { prisma: db }
        if (cache.has(filename)) return cache.get(filename).exports
        const module = { exports: {} }
        cache.set(filename, module)
        const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        }).outputText
        const localRequire = specifier => {
            if (filename === resolve(root, 'server/utils/sharedTarget.ts') && specifier === './shares') {
                return { getPublicShare: async event => {
                    const share = state.shared_items.find(row => row.token === event.token)
                    if (!share) throw Object.assign(new Error('Shared item not found.'), { statusCode: 404 })
                    return share
                } }
            }
            if (filename === resolve(root, 'server/utils/sharedTarget.ts') && specifier === 'h3') {
                return { getQuery: () => ({}) }
            }
            if (specifier === '~~/server/utils/prisma') return { prisma: db }
            if (specifier === '~~/server/utils/auth') {
                return { getAuthSession: event => event.userId ? { userId: event.userId } : null }
            }
            const target = specifier.startsWith('~~/') ? resolve(root, specifier.slice(3))
                : specifier.startsWith('.') ? resolve(dirname(filename), specifier) : null
            return target ? load(target.endsWith('.ts') ? target : `${target}.ts`) : require(specifier)
        }
        const globals = {
            defineEventHandler: handler => handler,
            getRouterParam: (event, key) => event.params[key],
            readBody: async event => event.body,
            enforceRateLimit: () => {},
            console: { error() {}, log() {} }
        }
        new Function('require', 'module', 'exports', ...Object.keys(globals), compiled)(
            localRequire, module, module.exports, ...Object.values(globals)
        )
        return module.exports
    }
    const request = (path, { id, body, userId = owner } = {}) => load(path).default({
        userId, body, params: { fileId: id, folderId: id, noteId: id, itemId: id }
    })
    const add = (kind, folderId = null, userId = owner) => {
        const item = {
            id: randomUUID(), user_id: userId, folder_id: folderId,
            parent_folder_id: kind === 'folder' ? folderId : null,
            name: `${kind}.txt`, title: 'Note', content: 'Note content',
            original_name: 'file.txt', mime_type: 'text/plain', size: 25n,
            storage_key: randomUUID()
        }
        state[models[kind]].push(item)
        state.favorites.push({
            id: randomUUID(), user_id: userId, file_id: null, folder_id: null, note_id: null,
            [`${kind}_id`]: item.id
        })
        return item
    }
    const tree = () => {
        const folder = add('folder')
        const child = add('folder', folder.id)
        const grandchild = add('folder', child.id)
        return [folder, child, grandchild, add('file', folder.id), add('file', grandchild.id),
            add('note', child.id), add('note', grandchild.id)]
    }
    const share = (kind, item, fields = {}) => {
        const row = {
            id: randomUUID(), user_id: item.user_id, item_id: item.id, item_type: kind,
            token: randomUUID(), password_hash: 'protected-password-hash',
            expires_at: new Date(Date.now() + 86400000), access_version: randomUUID(), ...fields
        }
        state.shared_items.push(row)
        return row
    }
    return {
        owner, otherOwner, state, calls, request, add, tree, share,
        publicTarget: token => load('server/utils/sharedTarget.ts').getSharedTarget({ token }),
        fail: (operation, remaining = 1) => { failure = { operation, remaining } }
    }
}

for (const kind of ['file', 'folder', 'note']) {
    test(`moving a favorite ${kind} to Trash removes its favorite and preserves other items and storage`, async () => {
        const f = fixture()
        const item = f.add(kind)
        const untouched = f.add(kind)
        const foreign = f.add(kind, null, f.otherOwner)
        const result = await f.request(singleRoutes[kind], { id: item.id })

        assert.equal(f.state.favorites.length, 2)
        assert.deepEqual(f.state.favorites.map(row => row[`${kind}_id`]), [untouched.id, foreign.id])
        assert.equal(f.state[models[kind]].some(row => row.id === item.id), false)
        assert.equal(f.state.trash[0].item_id, item.id)
        assert.deepEqual(result.trashIds, [f.state.trash[0].id])
        assert.notEqual(result.trashIds[0], item.id)
        if (kind !== 'folder') {
            assert.equal(f.state.trash[0].size, item.size)
        }
        if (kind === 'file') assert.equal(f.state.trash[0].storage_key, item.storage_key)
        assert.equal(f.state.users[0].storage_used, 1000n)
        assert.ok(f.calls.includes('favorites.deleteMany'))
    })

    test(`failed ${kind} Trash operations roll back favorite removal, Trash records and live items`, async () => {
        for (const operation of ['trash.create', 'trash.createMany', 'favorites.deleteMany', `${models[kind]}.delete`]) {
            if (kind === 'folder' && operation === 'trash.create') continue
            if (kind !== 'folder' && operation === 'trash.createMany') continue
            const f = fixture()
            const item = kind === 'folder' ? f.tree()[0] : f.add(kind)
            const before = structuredClone(f.state)
            f.fail(operation)
            await assert.rejects(f.request(singleRoutes[kind], { id: item.id }), { statusCode: 500 })
            assert.deepEqual(f.state, before)
        }
    })

    test(`another user's ${kind} cannot be trashed or removed from favorites`, async () => {
        const f = fixture()
        const item = f.add(kind, null, f.otherOwner)
        const before = structuredClone(f.state)
        await assert.rejects(f.request(singleRoutes[kind], { id: item.id }), { statusCode: 404 })
        assert.deepEqual(f.state, before)
    })
}

test('folder Trash removes favorites throughout the entire subtree and preserves unrelated favorites', async () => {
    const f = fixture()
    const items = f.tree()
    const untouched = f.add('folder')
    const foreign = f.add('folder', null, f.otherOwner)
    await f.request(singleRoutes.folder, { id: items[0].id })

    assert.deepEqual(f.state.favorites.map(row => row.folder_id), [untouched.id, foreign.id])
    assert.equal(f.state.trash.length, items.length)
    assert.ok(f.state.trash.every(row => row.root_folder_id === items[0].id))
    assert.equal(f.state.files.length, 0)
    assert.equal(f.state.notes.length, 0)
    assert.equal(f.state.users[0].storage_used, 1000n)
})

test('bulk folder Trash preserves separate restore groups while removing favorites from both subtrees', async () => {
    const f = fixture()
    const trees = [f.tree(), f.tree()]
    await f.request('server/api/folders/bulk-delete.post.ts', {
        body: { ids: trees.map(items => items[0].id) }
    })

    assert.deepEqual(f.state.favorites, [])
    assert.equal(f.state.trash.length, 14)
    for (const items of trees) {
        const ids = new Set(items.map(item => item.id))
        const trashed = f.state.trash.filter(row => ids.has(row.item_id))
        assert.equal(trashed.length, items.length)
        assert.ok(trashed.every(row => row.root_folder_id === items[0].id))
    }
})

for (const kind of ['file', 'folder', 'note']) {
    const path = `server/api/${models[kind]}/bulk-delete.post.ts`
    const body = ids => ({ [kind === 'file' ? 'fileIds' : 'ids']: ids })

    test(`bulk ${kind} Trash removes all selected favorites, including overlapping folder trees`, async () => {
        const f = fixture()
        const selected = kind === 'folder' ? f.tree().slice(0, 2) : [f.add(kind), f.add(kind)]
        const untouched = f.add(kind)
        const result = await f.request(path, { body: body([...selected.map(row => row.id), selected[0].id]) })

        assert.equal(f.state.favorites.length, 1)
        assert.equal(f.state.favorites[0][`${kind}_id`], untouched.id)
        assert.equal(f.state.trash.length, kind === 'folder' ? 7 : 2)
        assert.equal(result.trashIds.length, kind === 'folder' ? 1 : 2)
        assert.ok(result.trashIds.every(id => f.state.trash.some(row => row.id === id)))
        if (kind === 'folder') {
            assert.ok(f.state.trash.every(row => row.root_folder_id === selected[0].id))
        }
        assert.equal(f.state.users[0].storage_used, 1000n)
    })

    test(`bulk ${kind} Trash failure rolls back the entire batch and its favorites`, async () => {
        const f = fixture()
        const items = kind === 'folder' ? f.tree().slice(0, 2) : [f.add(kind), f.add(kind)]
        const before = structuredClone(f.state)
        f.fail(`${models[kind]}.${kind === 'file' ? 'delete' : 'deleteMany'}`, kind === 'file' ? 2 : 1)
        await assert.rejects(f.request(path, { body: body(items.map(row => row.id)) }), { statusCode: 500 })
        assert.deepEqual(f.state, before)
        assert.ok(f.calls.includes('favorites.deleteMany'))
    })

    test(`bulk ${kind} Trash rejects mixed ownership without removing any favorites`, async () => {
        const f = fixture()
        const mine = f.add(kind)
        const foreign = f.add(kind, null, f.otherOwner)
        const before = structuredClone(f.state)
        await assert.rejects(f.request(path, { body: body([mine.id, foreign.id]) }), { statusCode: 404 })
        assert.deepEqual(f.state, before)
    })

    for (const bulk of [false, true]) {
        test(`${bulk ? 'bulk' : 'single'} ${kind} restore does not recreate removed favorites`, async () => {
            const f = fixture()
            const item = kind === 'folder' ? f.tree()[0] : f.add(kind)
            const result = await f.request(singleRoutes[kind], { id: item.id })
            await f.request(bulk ? 'server/api/trash/bulk-restore.post.ts' : 'server/api/trash/[itemId].patch.ts', {
                id: result.trashIds[0], body: { itemIds: result.trashIds }
            })
            assert.deepEqual(f.state.favorites, [])
            assert.equal(f.state.trash.length, 0)
            assert.ok(f.state[models[kind]].some(row => row.id === item.id))
            assert.equal(f.state.users[0].storage_used, 1000n)
        })
    }
}

function loadComposable(path, name, env) {
    const source = readFileSync(resolve(root, path), 'utf8').replaceAll('import.meta.client', env.client ? 'true' : 'false')
    const ast = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest)
    const stripped = ts.factory.updateSourceFile(ast, ast.statements.filter(node => !ts.isImportDeclaration(node)))
    const code = ts.transpileModule(ts.createPrinter().printFile(stripped).replaceAll('export ', ''), {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText
    const globals = { ref, computed, reactive, useTrashActions: () => ({ notifyTrashed() {} }), ...env }
    if (name === 'useTrashActions') delete globals.useTrashActions
    return new Function(...Object.keys(globals), `${code}; return ${name}`)(...Object.values(globals))
}

test('all Trash actions refresh shared Favorites and Trash only after a successful mutation', async () => {
    for (const [file, name, kind] of [
        ['useFileActions', 'useFileActions', 'file'],
        ['useFolderActions', 'useFolderActions', 'folder'],
        ['useNotesActions', 'useNoteActions', 'note']
    ]) {
        for (const bulk of [false, true]) {
            for (const succeeds of [false, true]) {
                const events = []
                const states = new Map()
                const useState = (key, initial) => {
                    if (!states.has(key)) states.set(key, ref(initial()))
                    return states.get(key)
                }
                const favorite = { id: 'favorite' }
                useState('user-favorites', () => [favorite])
                const trashItem = { id: 'trash-item' }
                const useUser = loadComposable('app/composables/useUser.ts', 'useUser', {
                    useState,
                    useRequestFetch: () => async url => {
                        events.push(url)
                        return { favorites: [], files: [], folders: [], notes: [], items: [trashItem] }
                    }
                })
                const actions = loadComposable(`app/composables/actions/${file}.ts`, name, {
                    useUser,
                    useUpload: () => ({ isUploading: ref(false) }),
                    $fetch: async (url, options) => {
                        events.push(url)
                        if (!succeeds) throw new Error('Trash failed')
                        if (bulk) assert.deepEqual(options.body, { [kind === 'file' ? 'fileIds' : 'ids']: ['item'] })
                        return { success: true, deletedIds: ['item'], failedIds: [], trashIds: ['trash-item'] }
                    }
                })()
                const method = `delete${kind[0].toUpperCase()}${kind.slice(1)}${bulk ? 's' : ''}`
                const work = actions[method](bulk ? ['item', 'item'] : 'item')
                if (succeeds) {
                    await work
                    assert.deepEqual(events.slice(1).sort(), ['/api/favorites', '/api/files', '/api/folders', '/api/notes', '/api/trash'])
                    assert.deepEqual(states.get('user-favorites').value, [])
                    assert.deepEqual(states.get('user-trash').value, [trashItem])
                } else {
                    await assert.rejects(work, /Trash failed/)
                    assert.equal(events.length, 1)
                    assert.deepEqual(states.get('user-favorites').value, [favorite])
                }
                assert.equal(actions.isDeleting.value, false)
                assert.equal(actions.isLoading.value, false)
            }
        }
    }
})

test('a refresh error after committed Trash does not report a failed deletion', async () => {
    const states = new Map()
    const useUser = loadComposable('app/composables/useUser.ts', 'useUser', {
        useState: (key, initial) => {
            if (!states.has(key)) states.set(key, ref(initial()))
            return states.get(key)
        },
        useRequestFetch: () => async () => { throw new Error('Refresh failed') }
    })
    const actions = loadComposable('app/composables/actions/useFolderActions.ts', 'useFolderActions', {
        useUser, $fetch: async () => ({ success: true })
    })()
    let callbackCalled = false
    await actions.deleteFolder('item', async () => { callbackCalled = true })
    assert.equal(callbackCalled, true)
    assert.equal(states.get('user-error').value, 'Refresh failed')
})

function undoFixture(options = {}) {
    const f = fixture()
    const states = new Map()
    const timers = new Map()
    const calls = []
    const app = {}
    const route = { path: '/files', params: {}, ...options.route }
    let now = 10000
    let nextTimer = 0
    const useState = (key, initial) => {
        if (!states.has(key)) states.set(key, ref(initial()))
        return states.get(key)
    }
    const useToast = loadComposable('app/composables/ui/useToast.ts', 'useToast', {
        useState, useNuxtApp: () => app, client: true,
        useAuthUser: () => ref({ id: f.owner }), useNotifications: () => ({ addNotification() {} }),
        Date: { now: () => now },
        setTimeout: (run, delay) => {
            const id = ++nextTimer
            timers.set(id, { run, due: now + delay })
            return id
        },
        clearTimeout: id => timers.delete(id)
    })
    const useUser = loadComposable('app/composables/useUser.ts', 'useUser', {
        useState,
        useRequestFetch: () => async url => {
            const kind = url.split('/').at(-1)
            return { [kind === 'trash' ? 'items' : kind]: structuredClone(f.state[kind]) }
        }
    })
    const $fetch = async (url, request) => {
        calls.push([url, request])
        if (url.startsWith('/api/trash')) {
            await options.beforeRestore?.()
            return f.request(url.endsWith('bulk-restore')
                ? 'server/api/trash/bulk-restore.post.ts' : 'server/api/trash/[itemId].patch.ts', {
                id: url.split('/').at(-1), body: request.body
            })
        }
        const [, , model, id] = url.split('/')
        const type = Object.keys(models).find(type => models[type] === model)
        return f.request(id === 'bulk-delete' ? `server/api/${model}/bulk-delete.post.ts` : singleRoutes[type], {
            id, body: request.body
        })
    }
    const useTrashActions = loadComposable('app/composables/actions/useTrashActions.ts', 'useTrashActions', {
        useUser, useToast, useRouter: () => ({ currentRoute: ref(route) }), $fetch,
        refreshNuxtData: async key => calls.push(['refresh', key])
    })
    const actions = type => {
        const name = type === 'file' ? 'useFileActions' : type === 'folder' ? 'useFolderActions' : 'useNoteActions'
        const file = type === 'note' ? 'useNotesActions' : name
        return loadComposable(`app/composables/actions/${file}.ts`, name, {
            useUser, useTrashActions, $fetch,
            useUpload: () => ({ isUploading: ref(false) })
        })()
    }
    const advance = duration => {
        const target = now + duration
        while (true) {
            const entry = [...timers.entries()].filter(([, timer]) => timer.due <= target)
                .sort((a, b) => a[1].due - b[1].due)[0]
            if (!entry) break
            const [id, timer] = entry
            now = timer.due
            timers.delete(id)
            timer.run()
        }
        now = target
    }
    return { ...f, actions, calls, advance, states, route, ...useToast(), ...useTrashActions() }
}

for (const kind of ['file', 'folder', 'note']) {
    for (const bulk of [false, true]) {
        test(`${bulk ? 'bulk' : 'single'} ${kind} Trash and restore preserve the same share token and settings`, async () => {
            const f = fixture()
            const items = kind === 'folder' ? f.tree() : [f.add(kind)]
            const shares = items.map((item, index) => f.share(kind === 'folder' ? index < 3 ? 'folder' : index < 5 ? 'file' : 'note' : kind, item))
            const untouched = f.add('file', null, f.otherOwner)
            f.share('file', untouched)
            const before = structuredClone(f.state.shared_items)
            const bodyKey = kind === 'file' ? 'fileIds' : 'ids'
            const deleted = await f.request(bulk ? `server/api/${models[kind]}/bulk-delete.post.ts` : singleRoutes[kind], {
                id: items[0].id, body: { [bodyKey]: [items[0].id] }
            })
            assert.deepEqual(f.state.shared_items, before)
            for (const share of shares) await assert.rejects(f.publicTarget(share.token), { statusCode: 404 })
            await f.request(bulk ? 'server/api/trash/bulk-restore.post.ts' : 'server/api/trash/[itemId].patch.ts', {
                id: deleted.trashIds[0], body: { itemIds: deleted.trashIds }
            })
            assert.deepEqual(f.state.shared_items, before)
            for (const share of shares) {
                const target = await f.publicTarget(share.token)
                assert.equal(target.item.id, share.item_id)
                assert.equal(target.share.password_hash, share.password_hash)
                assert.equal(target.share.expires_at.getTime(), share.expires_at.getTime())
                assert.equal(target.share.access_version, share.access_version)
            }
        })
    }

    test(`${kind} toast Undo preserves its existing share link`, async () => {
        const f = undoFixture()
        const item = f.add(kind)
        const share = f.share(kind, item)
        const before = structuredClone(share)
        const actions = f.actions(kind)
        await actions[{ file: 'deleteFile', folder: 'deleteFolder', note: 'deleteNote' }[kind]](item.id)
        const toast = f.toasts.value.find(entry => entry.actionLabel === 'Undo')
        assert.ok(toast)
        await f.runToastAction(toast.id)
        assert.deepEqual(f.state.shared_items, [before])
        assert.equal((await f.publicTarget(share.token)).item.id, item.id)
    })
}

test('Undo does not recreate a share explicitly revoked while its item was in Trash', async () => {
    const f = fixture()
    const item = f.add('file')
    const share = f.share('file', item)
    const deleted = await f.request(singleRoutes.file, { id: item.id })
    assert.equal(f.state.shared_items.length, 1)
    f.state.shared_items = []
    await f.request('server/api/trash/[itemId].patch.ts', { id: deleted.trashIds[0] })
    assert.equal(f.state.shared_items.length, 0)
    await assert.rejects(f.publicTarget(share.token), { statusCode: 404 })
})

test('each deletion owns an independent eight-second Undo that restores its returned Trash ID', async () => {
    const f = undoFixture()
    const [first, second] = [f.add('file'), f.add('file')]
    const actions = f.actions('file')
    const result = await actions.deleteFile(first.id)
    const firstToast = f.toasts.value[0]
    await actions.deleteFile(second.id)
    const secondToast = f.toasts.value[1]

    assert.equal(firstToast.message, 'File moved to Trash')
    assert.equal(firstToast.actionLabel, 'Undo')
    assert.equal(f.toasts.value.length, 2)
    assert.doesNotThrow(() => JSON.stringify(f.toasts.value))
    await f.runToastAction(firstToast.id)

    assert.ok(f.state.files.some(row => row.id === first.id))
    assert.ok(f.state.trash.some(row => row.item_id === second.id))
    assert.deepEqual(f.state.favorites, [])
    assert.ok(f.calls.some(([url]) => url === `/api/trash/${result.trashIds[0]}`))
    assert.equal(f.toasts.value.at(-1).message, 'File restored successfully')
    assert.ok(f.toasts.value.some(toast => toast.id === secondToast.id))

    f.advance(7999)
    assert.ok(f.toasts.value.some(toast => toast.id === secondToast.id))
    f.advance(1)
    assert.equal(f.toasts.value.length, 0)
    await f.runToastAction(secondToast.id)
    assert.ok(f.state.trash.some(row => row.item_id === second.id))
})

test('Undo keeps its loading toast visible and ignores repeated clicks until restore finishes', async () => {
    let release
    const gate = new Promise(resolve => { release = resolve })
    const f = undoFixture({ beforeRestore: () => gate })
    const note = f.add('note')
    await f.actions('note').deleteNote(note.id)
    const toast = f.toasts.value[0]
    const first = f.runToastAction(toast.id)
    await f.runToastAction(toast.id)
    f.advance(9000)

    assert.equal(toast.pending, true)
    assert.ok(f.toasts.value.some(item => item.id === toast.id))
    assert.equal(f.calls.filter(([url]) => url.startsWith('/api/trash')).length, 1)
    release()
    await first

    assert.equal(f.state.notes.length, 1)
    assert.equal(f.toasts.value.at(-1).message, 'Note restored successfully')
})

test('bulk Undo restores 200 files atomically through the existing bulk restore API', async () => {
    const f = undoFixture()
    const files = Array.from({ length: 200 }, () => f.add('file'))
    const result = await f.actions('file').deleteFiles(files.map(file => file.id))
    assert.equal(f.toasts.value[0].message, '200 items moved to Trash')
    await f.runToastAction(f.toasts.value[0].id)

    const restore = f.calls.find(([url]) => url === '/api/trash/bulk-restore')
    assert.deepEqual(restore[1].body.itemIds, result.trashIds)
    assert.equal(f.state.files.length, 200)
    assert.equal(f.state.trash.length, 0)
    assert.equal(f.state.favorites.length, 0)
    assert.equal(f.toasts.value.at(-1).message, '200 items restored successfully')
    assert.equal(f.states.get('user-files').value.length, 200)
    assert.equal(f.states.get('user-trash').value.length, 0)
})

test('folder Undo restores descendants and refreshes the current folder contents without navigation', async () => {
    const f = undoFixture({ route: { path: '/folders/parent', params: { folderId: 'parent' } } })
    const items = f.tree()
    await f.actions('folder').deleteFolder(items[0].id)
    await f.runToastAction(f.toasts.value[0].id)

    assert.equal(f.state.folders.length, 3)
    assert.equal(f.state.files.length, 2)
    assert.equal(f.state.notes.length, 2)
    assert.equal(f.state.favorites.length, 0)
    assert.ok(f.calls.some(([action, key]) => action === 'refresh' && key === 'folder-details:parent'))
    assert.equal(f.route.path, '/folders/parent')
})

test('failed moves never show success or Undo; failed restore preserves Trash and allows retry', async () => {
    const f = undoFixture()
    const file = f.add('file')
    f.fail('files.delete')
    await assert.rejects(f.actions('file').deleteFile(file.id), { statusCode: 500 })
    assert.equal(f.toasts.value.length, 0)

    f.fail(null)
    await f.actions('file').deleteFile(file.id)
    const toast = f.toasts.value[0]
    f.fail('files.create')
    await f.runToastAction(toast.id)
    assert.equal(f.toasts.value.at(-1).type, 'error')
    assert.equal(f.state.trash.length, 1)
    assert.equal(toast.pending, false)
    assert.equal(f.toasts.value.filter(item => item.message.includes('restored successfully')).length, 0)

    f.fail(null)
    await f.runToastAction(toast.id)
    assert.equal(f.state.files.length, 1)
    assert.equal(f.state.trash.length, 0)
})

test('mixed and partially successful batches share one Undo containing only successful Trash IDs', async () => {
    const f = undoFixture()
    const file = f.add('file')
    const note = f.add('note')
    const folder = f.add('folder')
    const first = await f.actions('file').deleteFiles([file.id], { notify: false })
    const second = await f.actions('note').deleteNotes([note.id], { notify: false })
    f.fail('folders.delete')
    await assert.rejects(f.actions('folder').deleteFolder(folder.id, undefined, { notify: false }))
    assert.equal(f.toasts.value.length, 0)

    f.notifyTrashed({
        success: true, deletedIds: [file.id, note.id], failedIds: [folder.id],
        trashIds: [...first.trashIds, ...second.trashIds]
    }, undefined, true)
    assert.equal(f.toasts.value[0].message, '2 items moved to Trash')
    await f.runToastAction(f.toasts.value[0].id)

    assert.equal(f.state.files.length, 1)
    assert.equal(f.state.notes.length, 1)
    assert.equal(f.state.folders.length, 1)
    assert.deepEqual(f.state.favorites.map(row => row.folder_id), [folder.id])
})

test('older collection requests cannot overwrite refreshed data after Undo', async () => {
    const states = new Map()
    let release
    let requests = 0
    const useUser = loadComposable('app/composables/useUser.ts', 'useUser', {
        useState: (key, initial) => {
            if (!states.has(key)) states.set(key, ref(initial()))
            return states.get(key)
        },
        useRequestFetch: () => async () => {
            if (++requests === 1) return new Promise(resolve => { release = resolve })
            return { files: [{ id: 'restored-file' }] }
        }
    })
    const first = useUser().fetchFiles()
    await useUser().fetchFiles()
    release({ files: [] })
    await first
    assert.deepEqual(states.get('user-files').value, [{ id: 'restored-file' }])
})
