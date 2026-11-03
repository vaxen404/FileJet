import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHash, createHmac } from 'node:crypto'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import pg from 'pg'

const base = process.env.FILEJET_TEST_URL || 'http://127.0.0.1:3020'
const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
const owner = randomUUID(), other = randomUUID(), folder = randomUUID(), clean = randomUUID(), infected = randomUUID(), version = randomUUID(), requestId = randomUUID(), incoming = randomUUID()
const token = randomUUID(), requestToken = randomUUID(), sessions = []
const root = resolve('storage'), ownerPath = resolve(root, owner)
const eicar = Buffer.from(['X5O!P%@AP[4', String.fromCharCode(92), 'PZX54(P^)7CC)7}', '$', 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!', '$', 'H+H*'].join(''))
const safe = Buffer.from('FileJet clean integration fixture')
const cookie = id => {
    const payload = Buffer.from(JSON.stringify({ userId: id, expiresAt: Date.now() + 3600000 })).toString('base64url')
    return 'filejet_session=' + payload + '.' + createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('base64url')
}
async function api(path, { method = 'GET', body, status = 200, auth = owner, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(auth ? { Cookie: cookie(auth) } : {}), ...(body && !(body instanceof FormData) && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body instanceof FormData || Buffer.isBuffer(body) ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000) })
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(response.status, status, `${method} ${path}: ${bytes.toString().slice(0, 250)}`)
    try { return JSON.parse(bytes.toString()) } catch { return bytes }
}
async function upload(bytes, name, kind = 'files', extra = {}, status = 200) {
    const id = randomUUID(), key = randomUUID() + randomUUID(); sessions.push(id)
    const manifest = { id, kind, folderId: null, ...extra, files: [{ name, path: kind === 'folders' ? 'Bundle/' + name : name, type: 'text/plain', size: bytes.length, hashes: [createHash('sha256').update(bytes).digest('hex')] }] }
    await api('/api/uploads', { method: 'POST', body: manifest, headers: { 'Upload-Key': key } })
    await api(`/api/uploads/${id}/0`, { method: 'PUT', body: bytes, headers: { 'Content-Type': 'application/octet-stream', 'Upload-Key': key, 'Upload-Offset': '0' } })
    return api(`/api/uploads/${id}/complete`, { method: 'POST', headers: { 'Upload-Key': key }, status })
}
await db.connect()
try {
    for (const id of [owner, other]) await db.query('INSERT INTO users(id,username,password_hash,storage_limit,storage_used) VALUES($1,$2,$3,1073741824,1000)', [id, 'qa_antivirus_' + id, 'unused-fixture-password'])
    await mkdir(ownerPath, { recursive: true })
    await db.query('INSERT INTO folders(id,user_id,name) VALUES($1,$2,$3)', [folder, owner, 'Antivirus fixture'])
    await writeFile(resolve(ownerPath, 'clean'), safe)
    await writeFile(resolve(ownerPath, 'infected'), eicar)
    await writeFile(resolve(ownerPath, 'bad-version'), eicar)
    await writeFile(resolve(ownerPath, 'bad-incoming'), eicar)
    for (const [id, key, bytes] of [[clean, 'clean', safe], [infected, 'infected', eicar]]) {
        await db.query('INSERT INTO files(id,user_id,folder_id,name,original_name,mime_type,size,storage_key,revision) VALUES($1,$2,$3,$4,$4,$5,$6,$7,2)', [id, owner, folder, key + '.txt', 'text/plain', bytes.length, owner + '/' + key])
    }
    await db.query('INSERT INTO file_versions(id,user_id,file_id,revision,name,mime_type,size,storage_key) VALUES($1,$2,$3,1,$4,$5,$6,$7)', [version, owner, clean, 'clean.txt', 'text/plain', eicar.length, owner + '/bad-version'])
    await db.query('INSERT INTO shared_items(user_id,item_id,item_type,token) VALUES($1,$2,$3,$4)', [owner, infected, 'file', token])
    await db.query('INSERT INTO file_requests(id,user_id,title,token) VALUES($1,$2,$3,$4)', [requestId, owner, 'AV inbox', requestToken])
    await db.query('INSERT INTO request_uploads(id,request_id,name,size,storage_key,mime_type) VALUES($1,$2,$3,$4,$5,$6)', [incoming, requestId, 'infected.txt', eicar.length, owner + '/bad-incoming', 'text/plain'])

    await api(`/api/files/${clean}/scan`, { auth: null, status: 401 })
    await api(`/api/files/${clean}/scan`, { auth: other, status: 404 })
    await api(`/api/files/${clean}/scan`, { method: 'POST', headers: { Origin: 'https://foreign.example' }, status: 403 })
    assert.deepEqual(await api(`/api/files/${clean}/download`), safe)
    assert.equal((await api(`/api/files/${clean}/scan`)).status, 'clean')
    const detection = await api(`/api/files/${infected}/scan`, { method: 'POST' })
    assert.equal(detection.status, 'infected')
    assert.match(detection.threat, /Eicar/i)
    for (const method of ['GET', 'HEAD']) await api(`/api/files/${infected}/download`, { method, status: 423 })
    await api(`/api/files/${infected}/preview`, { status: 423 })
    await api(`/api/shared/${token}/download`, { auth: null, status: 423 })
    await api(`/api/shared/${token}/preview`, { auth: null, status: 423 })
    await api(`/api/folders/${folder}/download`, { status: 423 })
    await api('/api/items/download', { method: 'POST', body: { items: [{ type: 'file', id: infected }] }, status: 423 })
    await api(`/api/files/${clean}/versions/${version}/download`, { status: 423 })
    await api(`/api/files/${clean}/versions/${version}/restore`, { method: 'POST', body: { revision: 2 }, status: 423 })
    assert.equal((await db.query('SELECT revision FROM files WHERE id=$1', [clean])).rows[0].revision, 2)
    await api(`/api/inbox/${requestId}/uploads/${incoming}/preview`, { status: 423 })
    await api(`/api/inbox/${requestId}/uploads/${incoming}/download`, { status: 423 })
    await api(`/api/inbox/${requestId}/uploads/${incoming}/approve`, { method: 'POST', body: { folderId: null }, status: 423 })
    assert.equal((await db.query('SELECT status FROM request_uploads WHERE id=$1', [incoming])).rows[0].status, 'pending')
    await api('/api/quarantine', { auth: null, status: 401 })
    const quarantine = await api('/api/quarantine')
    assert.ok(quarantine.items.some(row => row.kind === 'file' && row.name === 'infected.txt'))
    assert.ok(quarantine.items.some(row => row.kind === 'version'))
    assert.ok(quarantine.items.some(row => row.kind === 'inbox'))
    assert.equal((await api('/api/quarantine', { auth: other })).items.length, 0)
    const quarantineId = Buffer.from(owner + '/infected').toString('base64url')
    await api(`/api/quarantine/${quarantineId}/scan`, { method: 'POST', auth: other, status: 404 })
    assert.equal((await api(`/api/quarantine/${quarantineId}/scan`, { method: 'POST' })).status, 'infected')
    await api('/api/quarantine?status=clean', { status: 400 })

    const count = async () => Number((await db.query('SELECT count(*) FROM files WHERE user_id=$1', [owner])).rows[0].count)
    const before = await count()
    const form = new FormData(); form.append('files', new Blob([eicar], { type: 'text/plain' }), 'blocked.txt')
    await api('/api/files', { method: 'POST', body: form, status: 423 })
    assert.equal(await count(), before)
    await upload(eicar, 'blocked-modern.txt', 'files', {}, 423)
    await upload(eicar, 'blocked-folder.txt', 'folders', {}, 423)
    await upload(eicar, 'blocked-inbox.txt', 'inbox', { requestToken }, 423)
    const blockedUpload = (await api('/api/quarantine')).items.find(row => row.kind === 'upload' && row.name === 'blocked-modern.txt')
    assert.ok(blockedUpload)
    await api(blockedUpload.deleteUrl, { method: 'DELETE', auth: other, status: 404 })
    await api(blockedUpload.deleteUrl, { method: 'DELETE' })
    assert.ok(!(await api('/api/quarantine')).items.some(row => row.id === blockedUpload.id))
    await upload(eicar, 'blocked-import.txt', 'notes', {}, 423)
    await upload(eicar, 'clean.txt', 'files', { replaceFileId: clean, expectedRevision: 2 }, 423)
    assert.equal(await count(), before)
    assert.equal((await db.query('SELECT revision FROM files WHERE id=$1', [clean])).rows[0].revision, 2)
    await upload(safe, 'accepted.txt')
    assert.equal(await count(), before + 1)
    const completedId = sessions.at(-1), reusedKey = randomUUID() + randomUUID()
    const acceptedId = (await db.query('SELECT id FROM files WHERE user_id=$1 AND original_name=$2', [owner, 'accepted.txt'])).rows[0].id
    await db.query('DELETE FROM upload_sessions WHERE id=$1', [completedId])
    await api('/api/uploads', { method: 'POST', body: { id: completedId, kind: 'files', folderId: null, files: [{ name: 'reused.txt', path: 'reused.txt', type: 'text/plain', size: safe.length, hashes: [createHash('sha256').update(safe).digest('hex')] }] }, headers: { 'Upload-Key': reusedKey } })
    await api(`/api/uploads/${completedId}/0`, { method: 'PUT', body: safe, headers: { 'Content-Type': 'application/octet-stream', 'Upload-Key': reusedKey, 'Upload-Offset': '0' } })
    await api(`/api/uploads/${completedId}/complete`, { method: 'POST', headers: { 'Upload-Key': reusedKey }, status: 409 })
    await api(`/api/uploads/${completedId}`, { method: 'DELETE', headers: { 'Upload-Key': reusedKey } })
    assert.deepEqual(await api(`/api/files/${acceptedId}/download`), safe)

    // Existing clean revisions and Inbox files must also pass preflight without
    // opening a second scan transaction while the owner row is locked.
    await writeFile(resolve(ownerPath, 'bad-version'), safe)
    await db.query('UPDATE file_versions SET size=$1 WHERE id=$2', [safe.length, version])
    await api(`/api/files/${clean}/versions/${version}/restore`, { method: 'POST', body: { revision: 2 } })
    assert.equal((await db.query('SELECT revision FROM files WHERE id=$1', [clean])).rows[0].revision, 3)
    assert.deepEqual(await api(`/api/files/${clean}/download`), safe)
    await writeFile(resolve(ownerPath, 'bad-incoming'), safe)
    await db.query('UPDATE request_uploads SET size=$1 WHERE id=$2', [safe.length, incoming])
    await api(`/api/inbox/${requestId}/uploads/${incoming}/approve`, { method: 'POST', body: { folderId: null } })
    assert.equal((await db.query('SELECT status FROM request_uploads WHERE id=$1', [incoming])).rows[0].status, 'approved')

    // A formerly clean cached result cannot certify modified bytes.
    const currentKey = (await db.query('SELECT storage_key FROM files WHERE id=$1', [clean])).rows[0].storage_key
    await writeFile(resolve(root, currentKey), eicar)
    await api(`/api/files/${clean}/download`, { status: 423 })
    assert.equal((await api(`/api/files/${clean}/scan`)).status, 'infected')
    console.log('Real ClamAV integration passed: clean/positive, access gates, upload paths, ownership, version rollback and changed-content invalidation.')
} finally {
    const uploads = (await db.query('SELECT id FROM upload_sessions WHERE user_id=ANY($1::uuid[])', [[owner, other]])).rows.map(row => row.id)
    await db.query('DELETE FROM upload_sessions WHERE user_id=ANY($1::uuid[])', [[owner, other]])
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner, other]])
    for (const path of [ownerPath, ...uploads.map(id => resolve(root, '.uploads', id))]) {
        if (!path.startsWith(root + sep) || path === root) throw new Error('Unsafe integration cleanup path.')
        await rm(path, { recursive: true, force: true })
    }
    await db.end()
}
