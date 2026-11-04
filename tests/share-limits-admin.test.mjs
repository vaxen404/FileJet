import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createError } from 'h3'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { adminUserUpdateSchema, adminUserCreateSchema, adminUserDeleteSchema } from '../shared/schemas/admin.ts'
import { adminQuotaBytes } from '../app/utils/adminQuota.ts'
import { isUuid } from '../server/utils/validation.ts'
import * as paths from 'node:path'

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

test('account creation normalizes identity, requires matching strong passwords and rejects privileged injected fields', () => {
    const valid = { username: ' NewUser ', email: ' EMAIL@EXAMPLE.COM ', password: 'safe-password-123', confirmPassword: 'safe-password-123', role: 'USER', storageLimit: '10485760' }
    const result = adminUserCreateSchema.parse(valid)
    assert.equal(result.username, 'NewUser')
    assert.equal(result.email, 'email@example.com')
    assert.equal(adminUserCreateSchema.parse({ ...valid, email: '' }).email, null)
    for (const patch of [{ username: 'ab' }, { email: 'invalid' }, { password: 'short' }, { confirmPassword: 'different' }, { role: 'ROOT' }, { storageLimit: '-1' }, { storage_used: 0 }, { id: 'injected' }, { password_hash: 'injected' }]) {
        assert.equal(adminUserCreateSchema.safeParse({ ...valid, ...patch }).success, false)
    }
    assert.equal(adminUserDeleteSchema.safeParse({ confirmUsername: 'NewUser' }).success, true)
    assert.equal(adminUserDeleteSchema.safeParse({ confirmUsername: '', id: 'injected' }).success, false)
})

test('MiB quota inputs support browser number coercion and reject invalid or overflowing values', () => {
    assert.equal(adminQuotaBytes(125), '131072000')
    assert.equal(adminQuotaBytes('0.5'), '524288')
    assert.equal(adminQuotaBytes('0'), '0')
    for (const value of [-1, 'NaN', 'Infinity', '1e20', '1.1234567', '99999999999999999999']) assert.throws(() => adminQuotaBytes(value))
})

test('deleted-account cleanup confines targets to the owner, retains failed work and safely retries', async () => {
    const userId = '11111111-1111-4111-8111-111111111111', uploadId = '22222222-2222-4222-8222-222222222222'
    let removed = false, fail = true, ownerExists = false
    const touched = []
    const tx = { $queryRaw: async () => [], users: { findUnique: async () => ownerExists ? { id: userId } : null },
        user_deletion_jobs: { findUnique: async () => removed ? null : { user_id: userId, upload_ids: [uploadId] }, delete: async () => { removed = true } } }
    const cleanup = load('server/utils/userDeletion.ts', {
        'node:path': paths,
        'node:fs/promises': { rm: async path => { touched.push(path); if (fail) throw new Error('Temporary filesystem error') } },
        './prisma': { prisma: { $transaction: async run => run(tx) } }, './validation': { isUuid }
    })
    const targets = cleanup.deletedUserStoragePaths(userId, [uploadId])
    assert.deepEqual(targets, [paths.resolve('storage', userId), paths.resolve('storage', '.uploads', uploadId)])
    assert.throws(() => cleanup.deletedUserStoragePaths('../foreign', [uploadId]))
    assert.throws(() => cleanup.deletedUserStoragePaths(userId, ['../foreign']))
    const originalError = console.error
    console.error = () => {}
    try {
        assert.equal(await cleanup.cleanupDeletedUser(userId), false)
        assert.equal(removed, false)
        fail = false; ownerExists = true; touched.length = 0
        assert.equal(await cleanup.cleanupDeletedUser(userId), false)
        assert.equal(touched.length, 0)
        ownerExists = false
        assert.equal(await cleanup.cleanupDeletedUser(userId), true)
        assert.equal(removed, true)
        assert.deepEqual(touched, targets)
        assert.equal(await cleanup.cleanupDeletedUser(userId), true)
    } finally { console.error = originalError }
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
    for (const filename of ['app/pages/admin/index.vue', 'app/pages/admin/activity.vue', 'app/pages/admin/users/index.vue', 'app/pages/admin/users/new.vue', 'app/pages/admin/users/[id].vue', 'app/layouts/admin.vue', 'app/components/admin/AdminNavigation.vue', 'app/components/admin/AdminActivityList.vue', 'app/components/ui/ShareBox.vue', 'app/components/layout/Sidebar.vue']) {
        const { descriptor } = parse(read(filename))
        const script = compileScript(descriptor, { id: 'limits-admin' })
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'limits-admin', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
    }
})
