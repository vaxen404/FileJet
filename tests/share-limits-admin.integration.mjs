import assert from 'node:assert/strict'
import 'dotenv/config'
import pg from 'pg'
import { randomUUID, createHmac } from 'node:crypto'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

const base = process.env.FILEJET_TEST_URL || 'http://localhost:3018'
const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
const owner = randomUUID(), member = randomUUID(), secondAdmin = randomUUID()
const ids = [owner, member, secondAdmin]
const storage = resolve('storage'), fixtureDirectory = resolve(storage, owner)
if (!fixtureDirectory.startsWith(storage + sep)) throw new Error('Invalid test directory.')
const cookie = (id, extra = {}) => {
    const value = Buffer.from(JSON.stringify({ userId: id, expiresAt: Date.now() + 3600000, ...extra })).toString('base64url')
    return 'filejet_session=' + value + '.' + createHmac('sha256', process.env.AUTH_SECRET).update(value).digest('base64url')
}
async function api(path, { method = 'GET', auth = null, body, status = 200, headers = {} } = {}) {
    const response = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(20000),
        headers: { ...(auth ? { Cookie: auth } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined })
    const text = await response.text()
    assert.equal(response.status, status, method + ' ' + path + ': ' + text.slice(0, 400))
    try { return JSON.parse(text) } catch { return text }
}
await db.connect()
try {
    for (const [id, role] of [[owner, 'ADMIN'], [member, 'USER'], [secondAdmin, 'ADMIN']]) {
        await db.query('INSERT INTO users(id,username,password_hash,role,storage_limit,storage_used) VALUES($1,$2,$3,$4,10485760,100)', [id, 'qa_limits_' + id, 'unused-fixture-account', role])
    }
    const adminCookie = cookie(owner), memberCookie = cookie(member, { role: 'ADMIN' })
    await api('/api/admin', { status: 401 })
    await api('/api/admin/users', { auth: memberCookie, status: 403 })
    await api('/api/admin/users/' + member, { auth: memberCookie, method: 'PATCH', body: { role: 'ADMIN', storageLimit: '10485760' }, status: 403 })
    const summary = await api('/api/admin', { auth: adminCookie })
    assert.ok(summary.admins >= 2)
    const listing = await api('/api/admin/users?search=qa_limits_', { auth: adminCookie })
    assert.equal(listing.users.length, 3)
    assert.ok(listing.users.every(user => !('password_hash' in user) && typeof user.storageLimit === 'string'))
    const dashboard = await api('/admin', { auth: adminCookie })
    assert.ok(dashboard.includes('Admin dashboard') && dashboard.includes('Admin navigation'))
    assert.equal(dashboard.includes('aria-label="Main navigation"'), false)
    const usersPage = await api('/admin/users', { auth: adminCookie })
    assert.ok(usersPage.includes('Account management') && usersPage.includes('Admin navigation'))
    await api('/admin', { status: 302 })
    await api('/admin/users', { status: 302 })
    await api('/admin', { auth: memberCookie, status: 403 })
    await api('/admin/users', { auth: memberCookie, status: 403 })
    await api('/api/admin/users?page=-1', { auth: adminCookie, status: 400 })
    await api('/api/users/@me', { auth: memberCookie, method: 'PATCH', body: { username: 'injected', email: '', role: 'ADMIN' }, status: 400 })
    await api('/api/admin/users/' + owner, { auth: adminCookie, method: 'PATCH', body: { role: 'USER', storageLimit: '10485760' }, status: 400 })
    await api('/api/admin/users/' + member, { auth: adminCookie, method: 'PATCH', body: { role: 'USER', storageLimit: '99' }, status: 400 })
    await api('/api/admin/users/' + member, { auth: adminCookie, method: 'PATCH', headers: { Origin: 'https://foreign.example' }, body: { role: 'USER', storageLimit: '10485760' }, status: 403 })
    await api('/api/admin/users/' + member, { auth: adminCookie, method: 'PATCH', body: { role: 'ADMIN', storageLimit: '20971520' } })
    await api('/api/admin', { auth: memberCookie })
    await api('/api/admin/users/' + member, { auth: adminCookie, method: 'PATCH', body: { role: 'USER', storageLimit: '20971520' } })
    await api('/api/admin', { auth: memberCookie, status: 403 })
    await api('/admin', { auth: memberCookie, status: 403 })
    assert.equal((await api('/api/users/@me', { auth: adminCookie })).role, 'ADMIN')

    const folderId = randomUUID(), noteId = randomUUID(), fileId = randomUUID()
    await db.query('INSERT INTO folders(id,user_id,name) VALUES($1,$2,$3)', [folderId, owner, 'Limit folder'])
    await db.query('INSERT INTO notes(id,user_id,folder_id,title,content,size) VALUES($1,$2,$3,$4,$5,5)', [noteId, owner, folderId, 'Limit note', 'hello'])
    await mkdir(fixtureDirectory, { recursive: true })
    await writeFile(resolve(fixtureDirectory, fileId), 'hello')
    await db.query('INSERT INTO files(id,user_id,name,original_name,mime_type,size,storage_key) VALUES($1,$2,$3,$3,$4,5,$5)', [fileId, owner, 'limit.txt', 'text/plain', owner + '/' + fileId])
    for (const maxDownloads of [0, -1, 1.5, 1000001, '1']) {
        await api('/api/shared', { auth: adminCookie, method: 'POST', body: { itemId: noteId, itemType: 'note', maxDownloads }, status: 400 })
    }
    const share = await api('/api/shared', { auth: adminCookie, method: 'POST', body: { itemId: noteId, itemType: 'note', maxDownloads: 2 } })
    assert.equal(share.maxDownloads, 2)
    const token = new URL(share.url).pathname.split('/').at(-1), publicPath = '/api/shared/' + token
    await api(publicPath)
    await api(publicPath + '/preview')
    await api(publicPath + '/download', { method: 'HEAD' })
    const downloads = await Promise.all(Array.from({ length: 8 }, async () => {
        const r = await fetch(base + publicPath + '/download', { headers: { DNT: '1', 'Sec-GPC': '1' } })
        await r.arrayBuffer(); return r.status
    }))
    assert.equal(downloads.filter(status => status === 200).length, 2)
    assert.equal(downloads.filter(status => status === 410).length, 6)
    await api(publicPath, { status: 410 })
    await api(publicPath + '/preview', { status: 410 })
    let state = await api('/api/shared?itemId=' + noteId + '&itemType=note', { auth: adminCookie })
    assert.equal(state.downloadCount, 2)
    assert.equal(state.isLimitReached, true)
    await api('/api/shared/items/note/' + noteId, { method: 'PATCH', auth: adminCookie, body: { maxDownloads: 3 } })
    assert.equal(await api(publicPath + '/download'), 'hello')
    await api('/api/shared/items/note/' + noteId, { method: 'PATCH', auth: adminCookie, body: { maxDownloads: null } })
    await api(publicPath + '/download')
    state = await api('/api/shared?itemId=' + noteId + '&itemType=note', { auth: adminCookie })
    assert.equal(state.downloadCount, 4)
    assert.equal(state.isLimitReached, false)

    // A missing file must not spend its limit; previews and password checks do not spend it either.
    const fileShare = await api('/api/shared', { auth: adminCookie, method: 'POST', body: { itemId: fileId, itemType: 'file', maxDownloads: 1, passwordAction: 'set', password: 'test-password' } })
    const fileToken = new URL(fileShare.url).pathname.split('/').at(-1)
    await api('/api/shared/' + fileToken + '/download', { status: 401 })
    const unlocked = await fetch(base + '/api/shared/' + fileToken + '/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }) })
    assert.equal(unlocked.status, 200)
    await unlocked.arrayBuffer()
    const grant = unlocked.headers.get('set-cookie').split(';')[0]
    await api('/api/shared/' + fileToken + '/preview', { auth: grant })
    await rm(resolve(fixtureDirectory, fileId))
    await api('/api/shared/' + fileToken + '/download', { auth: grant, status: 404 })
    await writeFile(resolve(fixtureDirectory, fileId), 'hello')
    assert.equal(await api('/api/shared/' + fileToken + '/download', { auth: grant }), 'hello')
    await api('/api/shared/' + fileToken + '/preview', { auth: grant, status: 410 })

    const folderShare = await api('/api/shared', { auth: adminCookie, method: 'POST', body: { itemId: folderId, itemType: 'folder', maxDownloads: 1 } })
    const folderToken = new URL(folderShare.url).pathname.split('/').at(-1)
    await api('/api/shared/' + folderToken + '/contents')
    await api('/api/shared/' + folderToken + '/download?itemId=' + fileId + '&itemType=file', { status: 404 })
    await api('/api/shared/' + folderToken + '/download')
    await api('/api/shared/' + folderToken + '/contents', { status: 410 })
    await api('/api/shared/' + folderToken + '/download?itemId=' + noteId + '&itemType=note', { status: 410 })
    const demotions = await Promise.all([[owner, secondAdmin], [secondAdmin, owner]].map(async ([actor, target]) => {
        const r = await fetch(base + '/api/admin/users/' + target, { method: 'PATCH',
            headers: { Cookie: cookie(actor), 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'USER', storageLimit: '10485760' }) })
        await r.arrayBuffer(); return r.status
    }))
    assert.deepEqual(demotions.sort(), [200, 403])
    assert.equal((await db.query("SELECT count(*)::int AS count FROM users WHERE id = ANY($1::uuid[]) AND role = 'ADMIN'", [ids])).rows[0].count, 1)
    console.log('Share limits and admin HTTP/DB checks passed: concurrent limits, HEAD/previews, DNT, password protection, file/folder/note delivery, limit reopening, missing files, role enforcement, demotion and quota validation.')
} finally {
    await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids])
    await rm(fixtureDirectory, { recursive: true, force: true })
    await db.end()
}
