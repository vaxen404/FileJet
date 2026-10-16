import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { join, resolve, sep } from 'node:path'
import test from 'node:test'
import { computed, nextTick, reactive, ref, watch } from 'vue'

const root = new URL('../', import.meta.url)
const owner = '10000000-0000-4000-8000-000000000000'
const first = '10000000-0000-4000-8000-000000000001'
const second = '10000000-0000-4000-8000-000000000002'
const third = '10000000-0000-4000-8000-000000000003'

async function load(path, bindings, result, async = false) {
    let source = await fs.readFile(new URL(path, root), 'utf8')
    if (path.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    const code = stripTypeScriptTypes(source.replaceAll('import.meta.client', 'true'))
        .replace(/^import .+$/gm, '')
        .replace(/^export default /gm, 'const handler = ')
        .replace(/^export /gm, '')
    const Constructor = async ? Object.getPrototypeOf(async function () {}).constructor : Function
    return new Constructor(...Object.keys(bindings), `${code}\nreturn ${result}`)(...Object.values(bindings))
}

async function server(options = {}) {
    const records = [first, second, third].map((id, index) => ({
        id, user_id: options.foreign && id === second ? 'someone-else' : owner,
        storage_key: `${owner}/${id}.txt`, size: BigInt((index + 1) * 100)
    }))
    let state = { files: new Map(records.map(file => [file.id, file])), shares: new Set([first, second, third]), favorites: new Set([first, second, third]), used: 600n }
    const disk = new Set(records.filter(file => file.id !== options.missing).map(file => resolve('mock-workspace', 'storage', file.storage_key)))
    const unlinked = [], rates = [], queries = [], logged = []
    const handler = await load('server/api/files/bulk-delete.post.ts', {
        defineEventHandler: handler => handler,
        getAuthSession: () => options.noSession ? null : { userId: owner },
        readBody: async () => options.body ?? { fileIds: [first, second] },
        enforceRateLimit(event, ...args) {
            rates.push(args)
            if (options.rateLimited) throw Object.assign(new Error('Too many requests.'), { statusCode: 429 })
        },
        throwError(code, message) { throw Object.assign(new Error(message), { statusCode: code }) },
        isUuid: value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
        process: { cwd: () => 'mock-workspace' },
        join, resolve, sep,
        console: { error: (...args) => logged.push(args) },
        async unlink(path) {
            unlinked.push(path)
            if (options.diskFailure && path.endsWith(`${second}.txt`)) throw Object.assign(new Error('File locked.'), { code: 'EPERM' })
            if (!disk.delete(path)) throw Object.assign(new Error('Missing.'), { code: 'ENOENT' })
        },
        prisma: {
            files: {
                async findMany({ where }) {
                    queries.push(where)
                    return [...state.files.values()].filter(file => where.id.in.includes(file.id) && file.user_id === where.user_id)
                },
                delete({ where }) {
                    return draft => {
                        if (options.dbFailure === where.id) throw new Error('Database unavailable.')
                        assert.ok(draft.files.delete(where.id))
                        draft.favorites.delete(where.id)
                    }
                }
            },
            shared_items: {
                deleteMany({ where }) {
                    assert.equal(where.user_id, owner)
                    assert.equal(where.item_type, 'file')
                    return draft => draft.shares.delete(where.item_id)
                }
            },
            users: {
                update({ where, data }) {
                    assert.equal(where.id, owner)
                    return draft => { draft.used -= data.storage_used.decrement }
                }
            },
            async $transaction(operations) {
                const draft = { files: new Map(state.files), shares: new Set(state.shares), favorites: new Set(state.favorites), used: state.used }
                for (const operation of operations) operation(draft)
                state = draft
            }
        }
    }, 'handler')
    return { run: () => handler({}), state: () => state, disk, unlinked, queries, rates, logged }
}

test('requires authentication and valid bounded UUID lists before deleting anything', async () => {
    for (const options of [{ noSession: true }, { body: {} }, { body: { fileIds: [] } }, { body: { fileIds: [null] } }, { body: { fileIds: ['not-an-id'] } }, { body: { fileIds: Array(201).fill(first) } }]) {
        const f = await server(options)
        await assert.rejects(f.run(), error => error.statusCode === (options.noSession ? 401 : 400))
        assert.equal(f.unlinked.length, 0)
        assert.equal(f.queries.length, 0)
    }
})

test('rejects foreign or missing records before deleting any selected owner file', async () => {
    for (const options of [{ foreign: true }, { body: { fileIds: [first, '10000000-0000-4000-8000-000000000009'] } }]) {
        const f = await server(options)
        await assert.rejects(f.run(), error => error.statusCode === 404)
        assert.equal(f.unlinked.length, 0)
        assert.equal(f.state().used, 600n)
    }
})

test('deletes only selected files, removes shares and favorites, and decrements storage exactly once', async () => {
    const f = await server({ body: { fileIds: [first, second, first] } })
    assert.deepEqual(await f.run(), { success: true, deletedIds: [first, second], failedIds: [] })
    assert.deepEqual([...f.state().files.keys()], [third])
    assert.deepEqual([...f.state().shares], [third])
    assert.deepEqual([...f.state().favorites], [third])
    assert.equal(f.state().used, 300n)
    assert.equal(f.disk.size, 1)
    assert.equal(f.unlinked.length, 2)
    assert.equal(f.rates.length, 1)
    assert.equal(f.rates[0][0], `files-delete:${owner}`)
})

test('reports partial storage failures without deleting or charging failed files', async () => {
    const f = await server({ diskFailure: true })
    assert.deepEqual(await f.run(), { success: false, deletedIds: [first], failedIds: [second] })
    assert.equal(f.state().used, 500n)
    assert.ok(f.state().files.has(second))
    assert.ok(f.state().favorites.has(second))
    assert.equal(f.logged.length, 1)
})

test('cleans up metadata and quota when a selected storage file is already absent', async () => {
    const f = await server({ missing: first })
    assert.equal((await f.run()).success, true)
    assert.equal(f.state().used, 300n)
    assert.equal(f.state().files.has(first), false)
})

test('rolls back failed database operations and allows deletion to be retried', async () => {
    const options = { dbFailure: second }
    const f = await server(options)
    assert.deepEqual(await f.run(), { success: false, deletedIds: [first], failedIds: [second] })
    assert.equal(f.state().used, 500n)
    assert.ok(f.state().shares.has(second))
    options.dbFailure = null
    options.body = { fileIds: [second] }
    assert.deepEqual(await f.run(), { success: true, deletedIds: [second], failedIds: [] })
    assert.equal(f.state().used, 300n)
})

test('applies the existing delete rate limit to the batch request', async () => {
    const f = await server({ rateLimited: true })
    await assert.rejects(f.run(), error => error.statusCode === 429)
    assert.equal(f.unlinked.length, 0)
    assert.equal(f.queries.length, 0)
})

test('the action composable sends one deduplicated batch and resets loading on failure', async () => {
    const requests = []
    let fail = false, release
    const useFileActions = await load('app/composables/actions/useFileActions.ts', {
        ref, reactive, computed, canCopyFile: () => true,
        async $fetch(url, options) {
            requests.push({ url, options })
            await new Promise(resolve => { release = resolve })
            if (fail) throw new Error('Request failed.')
            return { success: true, deletedIds: [first, second], failedIds: [] }
        }
    }, 'useFileActions')
    const actions = useFileActions()
    await actions.deleteFiles([])
    assert.equal(requests.length, 0)
    const pending = actions.deleteFiles([first, second, first])
    assert.equal(actions.isDeleting.value, true)
    assert.equal(actions.isLoading.value, true)
    assert.deepEqual(requests[0], { url: '/api/files/bulk-delete', options: { method: 'POST', body: { fileIds: [first, second] } } })
    release()
    await pending
    fail = true
    const failing = actions.deleteFiles([first])
    release()
    await assert.rejects(failing)
    assert.equal(actions.isLoading.value, false)
    assert.equal(actions.isDeleting.value, false)
})

async function page(options = {}) {
    const files = ref(Array.from({ length: options.count ?? 3 }, (_, index) => ({ id: String(index + 1), name: `file ${index + 1}`, original_name: 'file.txt' })))
    const error = ref(null), messages = [], requests = []
    let refreshes = 0, release
    const useSelection = await load('app/composables/ui/useSelection.ts', { ref, computed }, 'useSelection')
    const usePagination = await load('app/composables/ui/usePagination.ts', { ref, computed }, 'usePagination')
    const result = await load('app/pages/(user)/files/index.vue', {
        ref, computed, watch, nextTick, useSelection, usePagination,
        definePageMeta() {},
        useToast: () => ({ openToast: (...args) => messages.push(args) }),
        useUser: () => ({ files, error, favorites: ref([]), async fetchAll() { refreshes++; if (refreshes > 1 && options.refreshError) error.value = 'Refresh failed.' } }),
        useFavoriteActions: () => ({}),
        useSort: items => ({ sortedItems: items }),
        getFileCategory: () => 'Documents',
        useFileActions: () => ({
            isLoading: ref(false),
            async deleteFiles(ids) {
                requests.push(ids)
                if (options.defer) await new Promise(resolve => { release = resolve })
                if (options.requestError) throw new Error('Delete request failed.')
                return options.result ?? { success: true, deletedIds: ids, failedIds: [] }
            }
        })
    }, '{ selectedFiles, partiallySelected, handleDeleteSelected, isBulkDeleting, currentPage, paginatedFiles, toggleSelectAll }', true)
    return { ...result, files, messages, requests, refreshes: () => refreshes, release: () => release() }
}

test('page deletion clears successful selections, preserves unselected files and returns to a valid page', async () => {
    const f = await page({ count: 13 })
    f.currentPage.value = 2
    f.toggleSelectAll({ target: { checked: true } })
    assert.deepEqual(f.selectedFiles.value, ['13'])
    await f.handleDeleteSelected()
    await nextTick()
    assert.equal(f.files.value.length, 12)
    assert.equal(f.currentPage.value, 1)
    assert.deepEqual(f.selectedFiles.value, [])
    assert.equal(f.messages.at(-1)[1], 'success')
    assert.equal(f.refreshes(), 2)
})

test('page preserves failed selections and reports partial deletion', async () => {
    const f = await page({ result: { success: false, deletedIds: ['1'], failedIds: ['2'] } })
    f.selectedFiles.value = ['1', '2']
    assert.equal(f.partiallySelected.value, true)
    await f.handleDeleteSelected()
    await nextTick()
    assert.deepEqual(f.selectedFiles.value, ['2'])
    assert.deepEqual(f.files.value.map(file => file.id), ['2', '3'])
    assert.equal(f.messages.at(-1)[1], 'error')
    assert.match(f.messages.at(-1)[0], /1 file deleted.*1 could not be deleted/)
})

test('page ignores empty selection and blocks repeat clicks until refresh completes', async () => {
    const f = await page({ defer: true })
    await f.handleDeleteSelected()
    assert.equal(f.requests.length, 0)
    f.selectedFiles.value = ['1']
    const pending = f.handleDeleteSelected()
    assert.equal(f.isBulkDeleting.value, true)
    await f.handleDeleteSelected()
    assert.equal(f.requests.length, 1)
    f.release()
    await pending
    assert.equal(f.isBulkDeleting.value, false)
})

test('page reports request or refresh failures without a misleading deletion success', async () => {
    const failed = await page({ requestError: true })
    failed.selectedFiles.value = ['1']
    await failed.handleDeleteSelected()
    assert.deepEqual(failed.selectedFiles.value, ['1'])
    assert.equal(failed.isBulkDeleting.value, false)
    assert.equal(failed.messages.at(-1)[1], 'error')
    const refreshed = await page({ refreshError: true })
    refreshed.selectedFiles.value = ['1']
    await refreshed.handleDeleteSelected()
    assert.equal(refreshed.files.value.some(file => file.id === '1'), false)
    assert.equal(refreshed.messages.at(-1)[1], 'error')
    assert.match(refreshed.messages.at(-1)[0], /deleted successfully.*Refresh failed/)
})
