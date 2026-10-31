import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTags } from '../shared/utils/tags.ts'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import ts from 'typescript'
test('tags normalize whitespace and Unicode, remove duplicate case variants and allow clearing', () => {
    assert.deepEqual(parseTags([' Work ', '#Work', 'Ｗｏｒｋ', '# Invoice', 'Önemli']), ['Work', 'Invoice', 'Önemli'])
    assert.deepEqual(parseTags([]), [])
    for (const value of [null, 'Work', [3], [''], ['#'], ['x\0y'], ['x'.repeat(33)], Array(13).fill('a')]) assert.throws(() => parseTags(value))
})
test('tag controls and editors compile with their real script bindings', () => {
    for (const filename of ['app/components/ui/ItemTags.vue', 'app/components/ui/ItemTagsEditor.vue', 'app/components/ui/TagFilter.vue']) {
        const { descriptor } = parse(readFileSync(new URL('../'+filename, import.meta.url), 'utf8')), script = compileScript(descriptor, { id: 'tags' })
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'tags', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
    }
})
test('the tag endpoint scopes updates to the owner for files, folders and notes and reports missing items', async () => {
    const rows = Object.fromEntries(['files','folders','notes'].map(model => [model, { id: 'item', user_id: 'owner', tags: [] }]))
    const tx = Object.fromEntries(Object.keys(rows).map(model => [model, { updateMany: async ({where,data}) => {
        const row = rows[model]
        if (row.id !== where.id || row.user_id !== where.user_id) return { count: 0 }
        row.tags = data.tags; return { count: 1 }
    } }]))
    const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }) }
    const imports = {
        '~~/server/utils/prisma': { prisma: { $transaction: fn => fn(tx) } },
        '~~/server/utils/inbox': { inboxOwner: event => event.actor || fail(401, 'Sign in'), inboxParam: event => event.id },
        '~~/server/utils/storage': { lockStorageUser: async () => {} },
        '~~/server/utils/shares': { assertShareOrigin() {} },
        '~~/server/utils/shareBody': { readShareBody: async event => event.body },
        '~~/server/utils/error': { throwError: fail }, '~~/shared/utils/tags': { parseTags }
    }
    const code = ts.transpileModule(readFileSync(new URL('../server/api/items/[itemType]/[itemId]/tags.patch.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
    const module = { exports: {} }
    new Function('require','module','exports','defineEventHandler','getRouterParam','enforceRateLimit',code)(name => imports[name],module,module.exports,fn => fn,event => event.type,() => {})
    for (const type of ['file','folder','note']) {
        const event = { actor: 'owner', id: 'item', type, body: { tags: [' Work ', 'work'] } }
        assert.deepEqual(await module.exports.default(event), { tags: ['Work'] })
        await assert.rejects(module.exports.default({ ...event, actor: 'foreign', body: { tags: ['Wrong'] } }), { statusCode: 404 })
        assert.deepEqual(rows[type==='file'?'files':type==='folder'?'folders':'notes'].tags, ['Work'])
    }
    await assert.rejects(module.exports.default({ actor: null, id: 'item', type: 'file', body: { tags: [] } }), { statusCode: 401 })
})
