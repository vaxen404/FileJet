import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
const require = createRequire(import.meta.url)
function fixture() {
    const state = { keys: new Map(), daily: new Map(), fail: false }, cookies = []
    const tx = {
        share_event_keys: {
            createMany: async ({data:[row]}) => { if (state.keys.has(row.key)) return {count:0}; state.keys.set(row.key,row); return {count:1} },
            updateMany: async ({where,data}) => { const row=state.keys.get(where.key); if(!row || row.created_at>where.created_at.lte)return {count:0};row.created_at=data.created_at;return {count:1} },
            deleteMany: async ({where}) => { for(const [key,row] of state.keys)if(row.created_at<where.created_at.lt)state.keys.delete(key) }
        },
        share_daily_stats: { upsert: async ({where,create,update}) => {
            if(state.fail)throw new Error('database unavailable')
            const key=where.share_id_day.share_id+where.share_id_day.day.toISOString(),row=state.daily.get(key)
            if(!row)state.daily.set(key,create)
            else if(update.views){row.views+=1n;row.last_viewed_at=update.last_viewed_at}else{row.downloads+=1n;row.last_downloaded_at=update.last_downloaded_at}
        } }
    }
    const db={...tx,$transaction:async fn=>{const before=structuredClone({keys:state.keys,daily:state.daily});try{return await fn(tx)}catch(e){state.keys=before.keys;state.daily=before.daily;throw e}}}
    const imports={
        'node:crypto':require('node:crypto'),
        'h3':{getMethod:e=>e.method??'POST',getHeader:(e,key)=>e.headers?.[key.toLowerCase()],getCookie:e=>e.visitor,setCookie:(e,name,value,options)=>{e.visitor=value;cookies.push({name,value,options})}},
        '~~/server/utils/prisma':{prisma:db},'~~/server/utils/auth':{getAuthSession:e=>e.actor?{userId:e.actor}:null}
    }
    const source=readFileSync(new URL('../server/utils/shareStatistics.ts',import.meta.url),'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}}
    new Function('require','module','exports','process','console',code)(name=>imports[name],module,module.exports,{env:{AUTH_SECRET:'test-secret-with-more-than-thirty-two-characters',NODE_ENV:'test'}},{error(){}})
    return {...module.exports,state,cookies,event:()=>({visitor:'00000000-0000-0000-0000-000000000001'}),share:{id:'share',user_id:'owner'}}
}
test('share activity keys are opaque and scoped to the link, event and downloaded target',()=>{
    const f=fixture(),key=f.shareActivityKey('secret','share','visitor','view','')
    assert.match(key,/^[0-9a-f]{64}$/)
    assert.notEqual(key,f.shareActivityKey('secret','other','visitor','view',''))
    assert.notEqual(key,f.shareActivityKey('secret','share','visitor','download','file'))
})
test('repeated and concurrent views count once, then renew only after the rolling window',async()=>{
    const f=fixture(),results=await Promise.all(Array.from({length:12},()=>f.recordShareActivity(f.event(),f.share,'view')))
    assert.equal(results.filter(Boolean).length,1);assert.equal([...f.state.daily.values()][0].views,1n)
    for(const row of f.state.keys.values())row.created_at=new Date(Date.now()-31*60000)
    assert.equal(await f.recordShareActivity(f.event(),f.share,'view'),true)
    assert.equal([...f.state.daily.values()][0].views,2n)
})
test('owner visits, previews, HEAD/range requests and privacy opt-outs do not inflate counts',async()=>{
    const f=fixture()
    for(const extra of [{actor:'owner'},{method:'HEAD'},{headers:{range:'bytes=0-1'}},{headers:{dnt:'1'}},{headers:{'sec-gpc':'1'}}])assert.equal(await f.recordShareActivity({...f.event(),...extra},f.share,'view'),false)
    assert.equal(f.state.keys.size,0);assert.equal(f.state.daily.size,0)
})
test('download retries are deduplicated per item; browser identifiers stay in an HttpOnly cookie',async()=>{
    const f=fixture()
    assert.equal(await f.recordShareActivity(f.event(),f.share,'download','a'),true)
    assert.equal(await f.recordShareActivity(f.event(),f.share,'download','a'),false)
    assert.equal(await f.recordShareActivity(f.event(),f.share,'download','b'),true)
    assert.equal([...f.state.daily.values()][0].downloads,2n)
    await f.recordShareActivity({},f.share,'view')
    assert.equal(f.cookies[0].options.httpOnly,true);assert.equal(f.cookies[0].options.path,'/api/shared')
    assert.ok([...f.state.keys.values()].every(row=>!('ip' in row)&&!('visitor' in row)))
})
test('statistics failure does not block delivery or poison a future retry; key cleanup retains totals',async()=>{
    const f=fixture();f.state.fail=true
    assert.equal(await f.recordShareActivity(f.event(),f.share,'view'),false);assert.equal(f.state.keys.size,0)
    f.state.fail=false;assert.equal(await f.recordShareActivity(f.event(),f.share,'view'),true)
    for(const row of f.state.keys.values())row.created_at=new Date(Date.now()-3*86400000)
    await f.cleanupShareActivityKeys();assert.equal(f.state.keys.size,0);assert.equal([...f.state.daily.values()][0].views,1n)
})
test('the sharing statistics panel compiles',()=>{
    const filename='app/components/ui/ShareStatistics.vue',{descriptor}=parse(readFileSync(new URL('../'+filename,import.meta.url),'utf8')),script=compileScript(descriptor,{id:'stats'})
    assert.deepEqual(compileTemplate({source:descriptor.template.content,filename,id:'stats',compilerOptions:{bindingMetadata:script.bindings}}).errors,[])
})
