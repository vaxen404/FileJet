import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import pg from 'pg'
const db=new pg.Client({connectionString:process.env.DATABASE_URL}), base=process.env.FILEJET_TEST_URL||'http://127.0.0.1:3021'
const owner=randomUUID(), other=randomUUID(), secret='Private note body never in history', password='SecretSharePassword2026'
const cookie=userId=>{const payload=Buffer.from(JSON.stringify({userId,expiresAt:Date.now()+3600000})).toString('base64url');return `filejet_session=${payload}.${createHmac('sha256',process.env.AUTH_SECRET).update(payload).digest('base64url')}`}
async function api(path,{method='GET',body,status=200,user=owner}={}){
    const response=await fetch(base+path,{method,headers:{...(user?{Cookie:cookie(user)}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
    const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data
}
await db.connect()
try{
    for(const id of[owner,other])await db.query('INSERT INTO users(id,username,password_hash,storage_limit,storage_used) VALUES($1,$2,$3,1000000,0)',[id,'qa_activity_'+id,'unused'])
    await api('/api/activity',{user:null,status:401})
    const note=(await api('/api/notes',{method:'POST',body:{title:'History note',content:secret}})).note
    await api('/api/notes/'+note.id,{method:'PATCH',body:{title:'Renamed history note',content:secret,expectedUpdatedAt:note.updated_at}})
    const folder=(await api('/api/folders',{method:'POST',body:{name:'History destination'},status:201})).folder
    await api('/api/items/move',{method:'POST',body:{items:[{id:note.id,type:'note'}],destinationId:folder.id}})
    await api('/api/shared',{method:'POST',body:{itemId:note.id,itemType:'note',passwordAction:'set',password}})
    await api(`/api/shared/items/note/${note.id}`,{method:'PATCH',body:{passwordAction:'remove'}})
    await api(`/api/shared/items/note/${note.id}`,{method:'DELETE'})
    const before=(await api('/api/activity')).items.length
    await api('/api/notes/'+note.id,{method:'PATCH',body:{title:'Foreign',content:'blocked'},user:other,status:404})
    await api('/api/notes',{method:'POST',body:{title:'',content:''},status:400})
    assert.equal((await api('/api/activity')).items.length,before)
    const firstDelete=await api('/api/notes/'+note.id,{method:'DELETE'})
    await api('/api/trash/'+firstDelete.trashIds[0],{method:'PATCH'})
    const secondDelete=await api('/api/notes/'+note.id,{method:'DELETE'})
    await api('/api/trash/'+secondDelete.trashIds[0],{method:'DELETE'})
    const history=await api('/api/activity?itemId='+note.id)
    for(const action of['created','updated','moved','shared','share_updated','unshared','trashed','restored','deleted'])assert.ok(history.items.some(row=>row.action===action),action)
    assert.ok(history.items.some(row=>row.previousName==='History note'))
    assert.ok(history.items.some(row=>row.location==='History destination'))
    assert.ok(!JSON.stringify(history).includes(secret));assert.ok(!JSON.stringify(history).includes(password))
    assert.equal((await api('/api/activity',{user:other})).items.length,0)
    const offline={id:randomUUID(),title:'Idempotent history',content:'Draft',isNew:true,baseUpdatedAt:null}
    await api('/api/notes/offline-sync',{method:'POST',body:offline});await api('/api/notes/offline-sync',{method:'POST',body:offline})
    assert.equal((await api('/api/activity?itemId='+offline.id)).items.length,1)
    for(let index=0;index<53;index++)await db.query('INSERT INTO activity_entries(user_id,item_type,action,name,created_at) VALUES($1,$2,$3,$4,$5)',[owner,'file','uploaded','Pagination fixture '+index,'2020-01-01T00:00:00.123Z'])
    const page1=await api('/api/activity?q=Pagination%20fixture'), page2=await api('/api/activity?q=Pagination%20fixture&cursor='+encodeURIComponent(page1.nextCursor))
    assert.equal(page1.items.length,50);assert.equal(page2.items.length,3);assert.equal(new Set([...page1.items,...page2.items].map(row=>row.id)).size,53)
    assert.equal((await api('/api/activity?type=folder')).items.every(row=>row.type==='folder'),true)
    assert.equal((await api('/api/activity?action=trashed')).items.length,2)
    assert.equal((await api('/api/activity?from=2019-01-01T00:00:00Z&to=2021-01-01T00:00:00Z')).items.length,50)
    for(const query of['type=unknown','action=secret','cursor=bad','from=bad','from=2021-01-01&to=2020-01-01'])await api('/api/activity?'+query,{status:400})
    console.log('Activity passed: real mutations, failed-write exclusion, names after deletion, privacy, ownership, filters, timestamp ties and idempotent sync.')
}finally{await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[owner,other]]);await db.end()}
