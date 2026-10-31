import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {randomUUID,createHash,createHmac} from 'node:crypto'
import {readFile,rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve,sep} from 'node:path'
const repo=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(resolve(repo,'package.json'))
require('dotenv').config({path:repo+'/.env',quiet:true});const {Client}=require('pg'),db=new Client({connectionString:process.env.DATABASE_URL});await db.connect()
const base=process.env.FILEJET_TEST_URL || 'http://127.0.0.1:3018',userId=randomUUID(),otherId=randomUUID()
const cookie=id=>{const value=Buffer.from(JSON.stringify({userId:id,expiresAt:Date.now()+86400000})).toString('base64url');return 'filejet_session='+value+'.'+createHmac('sha256',process.env.AUTH_SECRET).update(value).digest('base64url')}
const as=cookie(userId),other=cookie(otherId)
const api=async(path,{method='GET',body,status=200,cookie:auth=as,headers={}}={})=>{const r=await fetch(base+path,{method,signal:AbortSignal.timeout(30000),headers:{...(auth?{Cookie:auth}:{}),...(body&&!Buffer.isBuffer(body)?{'Content-Type':'application/json'}:{}),...headers},body:body?Buffer.isBuffer(body)?body:JSON.stringify(body):undefined});const text=await r.text();assert.equal(r.status,status,path+': '+text.slice(0,800));try{return JSON.parse(text)}catch{return text}}
const upload=async(name,bytes,extra={})=>{
 const id=randomUUID(),key=randomUUID()+randomUUID(),headers={'Upload-Key':key},file={name,path:name,type:'text/plain',size:bytes.length,hashes:bytes.length?[createHash('sha256').update(bytes).digest('hex')]:[]}
 const view=await api('/api/uploads',{method:'POST',headers,body:{id,kind:'files',folderId:null,files:[file],...extra}})
 if(bytes.length)await api(`/api/uploads/${id}/0`,{method:'PUT',headers:{...headers,'Content-Type':'application/octet-stream','Upload-Offset':'0'},body:bytes})
 return api(`/api/uploads/${id}/complete`,{method:'POST',headers})
}
try{
 for(const id of [userId,otherId])await db.query('INSERT INTO users(id,username,password_hash,storage_limit,storage_used) VALUES($1,$2,$3,$4,0)',[id,'extension_qa_'+id,'unused-test-account',100*1024*1024])
 const first=Buffer.from('Version one'),second=Buffer.from('Version two with more text')
 await upload('document.txt',first)
 const file=(await api('/api/files')).files.find(f=>f.original_name==='document.txt')
 const share=await api('/api/shared',{method:'POST',body:{itemId:file.id,itemType:'file'}})
 await upload('document-updated.txt',second,{replaceFileId:file.id,expectedRevision:1})
 let history=await api(`/api/files/${file.id}/versions`);assert.equal(history.revision,2);assert.equal(history.versions.length,1)
 assert.equal(await api(`/api/files/${file.id}/versions/${history.versions[0].id}/download`),'Version one')
 assert.equal(await api(`/api/files/${file.id}/preview`),'Version two with more text')
 const quota=async()=>Number((await db.query('SELECT storage_used FROM users WHERE id=$1',[userId])).rows[0].storage_used)
 assert.equal(await quota(),first.length+second.length)
 assert.equal(Number((await api('/api/users/@me/storage')).storageUsed),await quota())
 await api(`/api/files/${file.id}/versions`,{cookie:other,status:404})
 await api(`/api/files/${file.id}/versions/${history.versions[0].id}/restore`,{method:'POST',body:{revision:1},status:409})
 await api(`/api/files/${file.id}/versions/${history.versions[0].id}/restore`,{method:'POST',body:{revision:2}})
 history=await api(`/api/files/${file.id}/versions`);assert.equal(history.revision,3);assert.equal(history.versions.length,2)
 assert.equal(await api(`/api/files/${file.id}/preview`),'Version one');assert.equal(await quota(),first.length*2+second.length)
 const originalShare=(await db.query('SELECT token FROM shared_items WHERE user_id=$1',[userId])).rows[0].token
 assert.equal(await api('/api/shared/'+originalShare+'/download',{cookie:null}),'Version one')
 const trashed=await api('/api/files/'+file.id,{method:'DELETE'});await api('/api/trash/'+trashed.trashIds[0],{method:'PATCH'})
 assert.equal((await api(`/api/files/${file.id}/versions`)).revision,3)
 await api(`/api/files/${file.id}/versions/${history.versions[1].id}`,{method:'DELETE'})
 assert.equal(await quota(),first.length+second.length)
 const originalPaths=(await db.query('SELECT storage_key FROM file_versions WHERE user_id=$1',[userId])).rows.map(r=>r.storage_key)
 const trashedAgain=await api('/api/files/'+file.id,{method:'DELETE'});await api('/api/trash/'+trashedAgain.trashIds[0],{method:'DELETE'})
 assert.equal(await quota(),0);assert.equal((await db.query('SELECT count(*) FROM file_versions WHERE user_id=$1',[userId])).rows[0].count,'0')
 for(const path of originalPaths) await assert.rejects(()=>readFile(repo+'/storage/'+path),{code:'ENOENT'})
 console.log('Version HTTP checks passed: replacement, exact quota, history download, stale revision conflict, restore, stable sharing, owner isolation, Trash restore, version deletion and permanent cleanup.')
}finally{
 const ids=[userId,otherId],sessions=(await db.query('SELECT id FROM upload_sessions WHERE user_id = ANY($1::uuid[])',[ids])).rows
 await db.query('DELETE FROM upload_sessions WHERE user_id = ANY($1::uuid[])',[ids])
 await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])',[ids])
 const storage=resolve(repo,'storage')
 for(const relative of [...ids,...sessions.map(row=>'.uploads/'+row.id)]){const path=resolve(storage,relative);if(!path.startsWith(storage+sep))throw new Error('Invalid fixture path');await rm(path,{recursive:true,force:true})}
 await db.end()
}
