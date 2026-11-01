import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createError } from 'h3'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { adminUserUpdateSchema } from '../shared/schemas/admin.ts'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
function load(name, imports) {
    const module = { exports: {} }
    const code = ts.transpileModule(read(name), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', code)(key => { assert.ok(key in imports, key); return imports[key] }, module, module.exports)
    return module.exports
}
const throwError = (statusCode, message, extra = {}) => { throw createError({ statusCode, message, ...extra }) }

test('admin settings reject privilege injection, invalid roles, negative quotas and PostgreSQL integer overflow', () => {
    for (const value of [
        { role: 'ROOT', storageLimit: '10' }, { role: 'ADMIN', storageLimit: '-1' },
        { role: 'USER', storageLimit: '9223372036854775808' }, { role: 'USER', storageLimit: '1.5' },
        { role: 'USER', storageLimit: '10', password_hash: 'injected' }
    ]) assert.equal(adminUserUpdateSchema.safeParse(value).success, false)
    assert.equal(adminUserUpdateSchema.safeParse({ role: 'USER', storageLimit: '9223372036854775807' }).success, true)
    assert.equal(adminUserUpdateSchema.safeParse({ role: 'ADMIN', storageLimit: '0' }).success, true)
})

test('admin authorization checks the database role on every request, including already issued sessions', async () => {
    let role = 'USER'
    const admin = load('server/utils/admin.ts', {
        './prisma': { prisma: { users: { findUnique: async () => ({ id: 'member', role }) } } },
        './auth': { getAuthSession: event => event.loggedIn ? { userId: 'member', role: 'ADMIN' } : null },
        './error': { throwError }
    })
    await assert.rejects(admin.requireAdmin({}), { statusCode: 401 })
    await assert.rejects(admin.requireAdmin({ loggedIn: true }), { statusCode: 403 })
    role = 'ADMIN'
    assert.equal((await admin.requireAdmin({ loggedIn: true })).role, 'ADMIN')
    role = 'USER'
    await assert.rejects(admin.requireAdmin({ loggedIn: true }), { statusCode: 403 })
})

test('download limits are independent of analytics; HEAD does not consume a download', async () => {
    let claims = 0
    const limits = load('server/utils/shareLimits.ts', {
        h3: { getMethod: event => event.method },
        './prisma': { prisma: { $queryRaw: async () => ++claims === 1 ? [{ id: 'share' }] : [] } },
        './error': { throwError }
    })
    assert.equal(limits.shareLimitReached({ max_downloads: null, download_count: 20 }), false)
    assert.equal(limits.shareLimitReached({ max_downloads: 1, download_count: 1 }), true)
    assert.throws(() => limits.assertShareDownloadLimit({ max_downloads: 1, download_count: 1 }), { statusCode: 410 })
    const share = { id: 'share', access_version: 'version' }
    await limits.claimShareDownload({ method: 'HEAD' }, share)
    assert.equal(claims, 0)
    await limits.claimShareDownload({ method: 'GET' }, share)
    await assert.rejects(limits.claimShareDownload({ method: 'GET' }, share), { statusCode: 410 })
})

test('admin and sharing forms compile with their actual Vue script bindings', () => {
    for (const filename of ['app/pages/admin/index.vue', 'app/pages/admin/users.vue', 'app/layouts/admin.vue', 'app/components/admin/AdminNavigation.vue', 'app/components/ui/ShareBox.vue', 'app/components/layout/Sidebar.vue']) {
        const { descriptor } = parse(read(filename))
        const script = compileScript(descriptor, { id: 'limits-admin' })
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'limits-admin', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
    }
})
