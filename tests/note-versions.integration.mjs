import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import pg from 'pg'
const db = new pg.Client({connectionString:process.env.DATABASE_URL}), base = process.env.FILEJET_TEST_URL || 'http://127.0.0.1:3021'
const owner = randomUUID(), other = randomUUID()
const cookie = userId => { const payload = Buffer.from(JSON.stringify({userId,expiresAt:Date.now()+3600000})).toString('base64url'); return `filejet_session=${payload}.${createHmac('sha256',process.env.AUTH_SECRET).update(payload).digest('base64url')}` }
async function request(path,{method='GET',body,user=owner,headers={}}={}) { const response=await fetch(base+path,{method,headers:{...(user?{Cookie:cookie(user)}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined}); const text=await response.text(); let data;try{data=JSON.parse(text)}catch{data=text}return {status:response.status,data} }
async function api(path,options={},status=200){const response=await request(path,options);assert.equal(response.status,status,`${path}: ${JSON.stringify(response.data)}`);return response.data}
const usage = async () => Number((await db.query('SELECT storage_used FROM users WHERE id=$1',[owner])).rows[0].storage_used)
const history = id => api(`/api/notes/${id}/versions`)
const create = async (title,content='First 📝\n    code  ') => (await api('/api/notes',{method:'POST',body:{title,content}})).note
const edit = async (note,content,title=note.title) => (await api('/api/notes/'+note.id,{method:'PATCH',body:{title,content,expectedRevision:note.revision,expectedUpdatedAt:note.updated_at}})).note
const purge = async id => {const trash=await api('/api/notes/'+id,{method:'DELETE'});await api('/api/trash/'+trash.trashIds[0],{method:'DELETE'})}
await db.connect()
try {
    for(const id of[owner,other])await db.query('INSERT INTO users(id,username,password_hash,storage_limit,storage_used) VALUES($1,$2,$3,10000000,0)',[id,'qa_nh_'+id,'unused'])
    let note=await create('Original title'), original={...note}
    const path=`/api/notes/${note.id}/versions`
    await api(path,{user:null},401);await api(path,{user:other},404)
    assert.equal((await history(note.id)).versions.length,0)
    note=await edit(note,'New body with preserved Markdown  \nNext','Updated title')
    assert.equal(note.revision,2)
    let versions=await history(note.id), saved=versions.versions[0]
    assert.equal(saved.revision,1);assert.equal(saved.title,original.title);assert.ok(!('content' in saved))
    assert.equal((await api(path+'/'+saved.id)).content,original.content)
    await api(path+'/'+saved.id,{user:other},404)
    await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:2},user:other},404)
    await api(path+'/'+saved.id,{method:'DELETE',user:other},404)
    await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:2},headers:{Origin:'https://foreign.example'}},403)
    const versionCount=()=>db.query('SELECT count(*) FROM note_versions WHERE note_id=$1',[note.id]).then(result=>Number(result.rows[0].count))
    assert.equal(await usage(),Buffer.byteLength(original.content)+Buffer.byteLength(note.content))
    assert.equal(Number((await api('/api/users/@me/storage')).storageUsed),await usage())
    await api('/api/notes/'+note.id,{method:'PATCH',body:{title:note.title,content:note.content,expectedRevision:1}})
    assert.equal(await versionCount(),1)
    await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:1}},409)
    const duplicate=await create(original.title,'Conflicting title')
    await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:2}},409)
    await purge(duplicate.id)
    await api('/api/shared',{method:'POST',body:{itemId:note.id,itemType:'note'}})
    const share=(await db.query('SELECT token FROM shared_items WHERE user_id=$1 AND item_id=$2',[owner,note.id])).rows[0].token
    note=(await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:2}})).note
    assert.equal(note.revision,3);assert.equal(note.content,original.content);assert.equal(note.title,original.title)
    assert.equal(await api('/api/shared/'+share+'/download',{user:null}),original.content)
    assert.equal((await history(note.id)).versions.length,2)
    const stale=await api('/api/notes/'+note.id)
    const raced=await Promise.all(['Concurrent A','Concurrent B'].map(content=>request('/api/notes/'+note.id,{method:'PATCH',body:{title:note.title,content,expectedRevision:stale.revision,expectedUpdatedAt:stale.updated_at}})))
    assert.deepEqual(raced.map(row=>row.status).sort(),[200,409])
    note=await api('/api/notes/'+note.id)
    const offline={id:note.id,title:note.title,content:'Offline revision',isNew:false,baseUpdatedAt:note.updated_at,baseRevision:note.revision}
    await api('/api/notes/offline-sync',{method:'POST',body:{...offline,baseRevision:note.revision-1}},409)
    const synced=await api('/api/notes/offline-sync',{method:'POST',body:offline})
    const countAfterSync=await versionCount();await api('/api/notes/offline-sync',{method:'POST',body:offline});assert.equal(await versionCount(),countAfterSync)
    note=await api('/api/notes/'+note.id)
    assert.equal(note.revision,synced.revision)
    const beforeQuota=await versionCount(), used=await usage()
    await db.query('UPDATE users SET storage_limit=storage_used WHERE id=$1',[owner])
    await api('/api/notes/'+note.id,{method:'PATCH',body:{title:note.title,content:'Blocked by quota',expectedRevision:note.revision}},400)
    assert.equal(await versionCount(),beforeQuota);assert.equal(await usage(),used)
    await api(path+'/'+saved.id+'/restore',{method:'POST',body:{revision:note.revision}},400)
    assert.equal((await api('/api/notes/'+note.id)).revision,note.revision)
    await db.query('UPDATE users SET storage_limit=10000000 WHERE id=$1',[owner])
    const deletedVersion=(await history(note.id)).versions[0], beforeDelete=await usage()
    await api(path+'/'+deletedVersion.id,{method:'DELETE'})
    assert.equal(await usage(),beforeDelete-Number(deletedVersion.size))
    await api(path+'/'+deletedVersion.id,{},404)
    const trash=await api('/api/notes/'+note.id,{method:'DELETE'})
    await api(path,{},404);await api('/api/trash/'+trash.trashIds[0],{method:'PATCH'})
    note=await api('/api/notes/'+note.id);assert.equal(note.revision,synced.revision)
    note=await edit(note,'After Trash restore')
    assert.equal(note.revision,synced.revision+1)
    await purge(note.id);assert.equal(await versionCount(),0);assert.equal(await usage(),0)

    // A fully populated history prunes its oldest entry atomically and charges exact bytes.
    let retained=await create('Retention','current')
    await db.query("INSERT INTO note_versions(user_id,note_id,revision,title,content,size) SELECT $1,$2,n,'Retention','old',3 FROM generate_series(1,100) n",[owner,retained.id])
    await db.query('UPDATE notes SET revision=101 WHERE id=$1',[retained.id]);await db.query('UPDATE users SET storage_used=storage_used+300 WHERE id=$1',[owner])
    retained=await api('/api/notes/'+retained.id);retained=await edit(retained,'next')
    const retainedHistory=await history(retained.id)
    assert.equal(retainedHistory.versions.length,100);assert.equal(retainedHistory.versions.at(-1).revision,2);assert.equal(retainedHistory.versions[0].revision,101)
    assert.equal(await usage(),99*3+Buffer.byteLength('current')+Buffer.byteLength('next'))
    assert.equal(Number((await api('/api/users/@me/storage')).storageUsed),await usage())
    const folder=(await api('/api/folders',{method:'POST',body:{name:'Versioned folder'}},201)).folder
    await api('/api/items/move',{method:'POST',body:{items:[{id:retained.id,type:'note'}],destinationId:folder.id}})
    const folderTrash=await api('/api/folders/'+folder.id,{method:'DELETE'})
    await api('/api/trash/bulk-restore',{method:'POST',body:{itemIds:folderTrash.trashIds}})
    assert.equal((await history(retained.id)).revision,102)
    const folderTrashAgain=await api('/api/folders/bulk-delete',{method:'POST',body:{ids:[folder.id]}})
    await api('/api/trash/bulk-delete',{method:'POST',body:{itemIds:folderTrashAgain.trashIds}})
    assert.equal(await usage(),0)
    assert.equal((await db.query('SELECT count(*) FROM note_versions WHERE user_id=$1',[owner])).rows[0].count,'0')
    console.log('Note history passed: snapshots, Unicode, exact quota, no-op retries, stale/concurrent writes, restore/sharing, offline sync, 100-version retention and single/folder/bulk Trash cleanup.')
}finally{await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[owner,other]]);await db.end()}
