import 'dotenv/config'
import assert from 'node:assert/strict'
import {randomUUID,createHmac} from 'node:crypto'
import pg from 'pg'
const db=new pg.Client({connectionString:process.env.DATABASE_URL}),base=process.env.FILEJET_TEST_URL||'http://127.0.0.1:3021'
const admin=randomUUID(),member=randomUUID(),second=randomUUID(),ids=[admin,member,second]
const prefix='qa_ad_'+admin.slice(0,8), secret='Private note body '+randomUUID(), password='Initial!password2026'
const trigger='qa_audit_'+admin.replaceAll('-','')
const cookie=(userId,extra={})=>{const p=Buffer.from(JSON.stringify({userId,expiresAt:Date.now()+3600000,...extra})).toString('base64url');return `filejet_session=${p}.${createHmac('sha256',process.env.AUTH_SECRET).update(p).digest('base64url')}`}
async function api(path,{method='GET',body,user=admin,status=200,headers={}}={}){
    const r=await fetch(base+path,{method,redirect:'manual',headers:{...(user?{Cookie:cookie(user,user===member?{role:'ADMIN'}:{})}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)})
    const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data).slice(0,500)}`);return data
}
const audit=()=>api('/api/admin/activity?source=admin&actorId='+admin)
await db.connect()
try{
    for(const[id,role]of[[admin,'ADMIN'],[member,'USER'],[second,'ADMIN']])await db.query('INSERT INTO users(id,username,password_hash,role,storage_limit,storage_used) VALUES($1,$2,$3,$4,10485760,0)',[id,prefix+'_'+role+'_'+id.slice(0,4),'unused',role])
    for(const path of['/api/admin/activity','/api/admin/activity/summary']){await api(path,{user:null,status:401});await api(path,{user:member,status:403})}
    let note=(await api('/api/notes',{method:'POST',user:member,body:{title:'Admin history fixture',content:secret}})).note
    note=(await api('/api/notes/'+note.id,{method:'PATCH',user:member,body:{title:'Renamed fixture',content:secret+' edited',expectedRevision:note.revision}})).note
    const userLog=await api('/api/admin/activity?userId='+member)
    assert.equal(userLog.source,'user');assert.equal(userLog.items.length,2);assert.ok(userLog.items.every(row=>row.userId===member&&row.username.startsWith(prefix)))
    assert.ok(!JSON.stringify(userLog).includes(secret));assert.ok(!JSON.stringify(userLog).includes('request_key'))
    const details=await api('/api/admin/users/'+member)
    assert.equal(details.counts.versions,1);assert.equal(details.storage.storageUsed,details.user.storageUsed)
    const account={username:prefix+'_created',email:'',password,confirmPassword:password,role:'USER',storageLimit:'20971520'}
    await api('/api/admin/users',{method:'POST',user:member,body:account,status:403})
    const created=(await api('/api/admin/users',{method:'POST',body:account,status:201})).user;ids.push(created.id)
    let log=await audit(), row=log.items.find(event=>event.userId===created.id)
    assert.equal(row.action,'account_created');assert.equal(row.quotaBefore,null);assert.equal(row.quotaAfter,'20971520');assert.equal(row.roleAfter,'USER')
    assert.ok(!JSON.stringify(log).includes(password));assert.ok(!JSON.stringify(log).includes('password_hash'))
    await api('/api/admin/users/'+created.id,{method:'PATCH',body:{role:'ADMIN',storageLimit:'31457280'}})
    log=await audit();row=log.items.find(event=>event.userId===created.id&&event.action==='account_updated')
    assert.equal(row.roleBefore,'USER');assert.equal(row.roleAfter,'ADMIN');assert.equal(row.quotaBefore,'20971520');assert.equal(row.quotaAfter,'31457280')
    const before=log.items.length
    await api('/api/admin/users/'+created.id,{method:'PATCH',body:{role:'ADMIN',storageLimit:'31457280'}})
    await api('/api/admin/users/'+created.id,{method:'PATCH',body:{role:'USER',storageLimit:'1'},headers:{Origin:'https://foreign.example'},status:403})
    await api('/api/admin/users/'+created.id,{method:'DELETE',body:{confirmUsername:'wrong'},status:409})
    assert.equal((await audit()).items.length,before)

    // A failure writing the audit row must roll back the account mutation too.
    assert.match(trigger,/^qa_audit_[0-9a-f]+$/)
    await db.query(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_id = '${admin}'::uuid THEN RAISE EXCEPTION 'QA audit failure'; END IF; RETURN NEW; END $$`)
    await db.query(`CREATE TRIGGER ${trigger} BEFORE INSERT ON admin_events FOR EACH ROW EXECUTE FUNCTION ${trigger}()`)
    try{
        await api('/api/admin/users/'+created.id,{method:'PATCH',body:{role:'USER',storageLimit:'41943040'},status:500})
        assert.equal((await api('/api/admin/users/'+created.id)).user.storageLimit,'31457280')
        assert.equal((await api('/api/admin/users/'+created.id)).user.role,'ADMIN')
        await api('/api/admin/users',{method:'POST',body:{...account,username:prefix+'_rollback'},status:500})
        assert.equal((await db.query('SELECT count(*) FROM users WHERE username=$1',[prefix+'_rollback'])).rows[0].count,'0')
        await api('/api/admin/users/'+created.id,{method:'DELETE',body:{confirmUsername:account.username},status:500})
        assert.equal((await api('/api/admin/users/'+created.id)).user.id,created.id)
    }finally{await db.query(`DROP TRIGGER IF EXISTS ${trigger} ON admin_events`);await db.query(`DROP FUNCTION IF EXISTS ${trigger}()`)}
    assert.equal((await audit()).items.length,before)
    await api('/api/admin/users/'+created.id,{method:'DELETE',body:{confirmUsername:account.username}})
    row=(await audit()).items.find(event=>event.userId===created.id&&event.action==='account_deleted')
    assert.equal(row.username,account.username);assert.equal(row.roleBefore,'ADMIN');assert.equal(row.roleAfter,null)
    await api('/api/admin/users/'+created.id,{status:404})

    // Admin metadata survives removal of the administrator who performed it.
    await api('/api/admin/users/'+admin,{method:'DELETE',user:second,body:{confirmUsername:prefix+'_ADMIN_'+admin.slice(0,4)}})
    await api('/api/admin/activity',{status:401})
    const retained=await api('/api/admin/activity?source=admin&userId='+created.id,{user:second})
    assert.ok(retained.items.length>=3);assert.ok(retained.items.every(event=>event.actorId===null&&event.actorName.startsWith(prefix)))

    for(let i=0;i<53;i++)await db.query('INSERT INTO activity_entries(user_id,item_type,action,name,created_at) VALUES($1,$2,$3,$4,$5)',[member,'file','uploaded',prefix+' paging '+i,'2020-01-01T00:00:00.123Z'])
    const first=await api('/api/admin/activity?source=user&q='+prefix+'&userId='+member,{user:second})
    const next=await api('/api/admin/activity?source=user&q='+prefix+'&userId='+member+'&cursor='+first.nextCursor,{user:second})
    assert.equal(first.items.length,50);assert.equal(next.items.length,3);assert.equal(new Set([...first.items,...next.items].map(row=>row.id)).size,53)
    assert.equal((await api('/api/admin/activity?source=user&userId='+member+'&action=updated',{user:second})).items.length,1)
    assert.equal((await api('/api/admin/activity?source=admin&user='+account.username+'&action=account_deleted',{user:second})).items.length,1)
    assert.ok((await api('/api/admin/activity?source=admin&actor='+prefix,{user:second})).items.every(event=>event.actorName.startsWith(prefix)))
    const summary=await api('/api/admin/activity/summary',{user:second});assert.equal(summary.days.length,7);assert.ok(summary.changes24h>=2);assert.ok(summary.adminActions24h>=4);assert.ok(summary.activeAccounts24h>=1)
    assert.ok(!JSON.stringify(summary).includes(secret))
    for(const query of['source=bad','action=bad','type=bad','cursor=bad','from=bad','from=2021-01-01&to=2020-01-01','limit=500','userId=bad','source=user&actor=x','source=admin&type=note'])await api('/api/admin/activity?'+query,{user:second,status:400})
    await db.query("UPDATE users SET role='USER' WHERE id=$1",[second]);await api('/api/admin/activity',{user:second,status:403});await api('/api/admin/activity/summary',{user:second,status:403})
    console.log('Admin history passed: fresh role authorization, metadata privacy, account audit, rollback atomicity, deletion retention, filters, cursor ties and summary.')
}finally{
    await db.query(`DROP TRIGGER IF EXISTS ${trigger} ON admin_events`);await db.query(`DROP FUNCTION IF EXISTS ${trigger}()`)
    await db.query('DELETE FROM admin_events WHERE target_user_id=ANY($1::uuid[]) OR actor_id=ANY($1::uuid[])',[ids])
    await db.query('DELETE FROM user_deletion_jobs WHERE user_id=ANY($1::uuid[])',[ids]);await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);await db.end()
}
