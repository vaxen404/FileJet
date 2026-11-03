import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import pg from 'pg'
const db = new pg.Client({ connectionString: process.env.DATABASE_URL }), base = process.env.FILEJET_TEST_URL || 'http://127.0.0.1:3021'
const owner = randomUUID(), other = randomUUID(), id = randomUUID()
function cookie(userId) { const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now()+3600000 })).toString('base64url'); return `filejet_session=${payload}.${createHmac('sha256',process.env.AUTH_SECRET).update(payload).digest('base64url')}` }
async function sync(body, status=200, user=owner, headers={}) {
    const response = await fetch(base+'/api/notes/offline-sync',{method:'POST',headers:{'Content-Type':'application/json',...(user ? {Cookie:cookie(user)} : {}),...headers},body:JSON.stringify(body)})
    const data = await response.json(); assert.equal(response.status,status,JSON.stringify(data)); return data
}
await db.connect()
try {
    for (const user of [owner,other]) await db.query('INSERT INTO users(id,username,password_hash,storage_limit,storage_used) VALUES($1,$2,$3,10000,0)',[user,'qa_offline_'+user,'unused'])
    const draft = {id,title:'Offline note',content:'Draft from device',isNew:true,baseUpdatedAt:null}
    await sync(draft,401,null); await sync(draft,403,owner,{Origin:'https://foreign.example'})
    const created = await sync(draft), usage = Number((await db.query('SELECT storage_used FROM users WHERE id=$1',[owner])).rows[0].storage_used)
    assert.equal(usage,Buffer.byteLength(draft.content)); assert.equal(created.id,id)
    await sync(draft); assert.equal(Number((await db.query('SELECT storage_used FROM users WHERE id=$1',[owner])).rows[0].storage_used),usage)
    await sync({...draft,content:'Foreign edit'},404,other)
    const edited = await sync({...draft,isNew:false,baseUpdatedAt:created.updated_at,content:'Updated offline draft'})
    await sync({...draft,isNew:false,baseUpdatedAt:created.updated_at,content:'Stale draft'},409)
    assert.equal((await db.query('SELECT content FROM notes WHERE id=$1',[id])).rows[0].content,edited.content)
    await sync({...draft,id:randomUUID(),content:'Duplicate title'},409)
    await sync({...draft,id:'invalid'},400)
    await sync({...draft,id:randomUUID(),title:'',content:''},400)
    await db.query('DELETE FROM notes WHERE id=$1',[id])
    await sync({...draft,isNew:false,baseUpdatedAt:edited.updated_at},404)
    console.log('Offline sync passed: idempotent create, quota, edits, conflicts, deletion, ownership and origin checks.')
}finally{await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[owner,other]]);await db.end()}
