import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { parseSender } from '../shared/utils/sender.ts'
import { parseUploadManifest, UPLOAD_CHUNK_SIZE, UPLOAD_LIFETIME } from '../shared/utils/resumableUpload.ts'
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8')
const digest = value => createHash('sha256').update(value).digest('hex')
const file = (name='hello.txt',size=3,path=name) => ({name,path,size,type:'text/plain',hashes:Array.from({length:Math.ceil(size/UPLOAD_CHUNK_SIZE)},()=>digest('abc'))})
const manifest = (extra={}) => ({kind:'files',folderId:null,files:[file()],...extra})
function memoryStorage() {
    const values=new Map()
    return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}
}

test('upload manifests reject traversal, forged chunk maps, overlarge batches and unsupported note imports',()=>{
    assert.equal(parseUploadManifest(manifest()).files.length,1)
    assert.doesNotThrow(()=>parseUploadManifest(manifest({kind:'folders',files:[file('hello.txt',3,'Root/Nested/hello.txt')]})))
    const cases=[manifest({files:[file('../bad')]}),manifest({files:[{...file(),hashes:[]}]}),manifest({files:[{...file(),size:-1}]}),manifest({files:[file(),file()]}),manifest({folderId:'other'}),manifest({kind:'notes',files:[file('x.exe')]}),manifest({kind:'folders',files:[file('hello.txt',3,'Root/../hello.txt')]}),manifest({kind:'folders',files:[file('hello.txt',3,'Root/x.txt')]}),manifest({kind:'inbox',requestToken:'invalid'}),manifest({kind:'inbox',requestToken:'00000000-0000-0000-0000-000000000001',files:[file('x',51*1024**2)]})]
    for(const input of cases)assert.throws(()=>parseUploadManifest(input))
})


function clientFixture({failChunk=false,lostCompletion=false,initialOffsets=[0]}={}){
    const storage=memoryStorage(),calls=[],offsets=[...initialOffsets]
    let lost=failChunk,completionLost=lostCompletion,result=null,identity
    const request=async(url,init)=>{
        calls.push({url,method:init.method,offset:init.headers['Upload-Offset']})
        if(url==='/api/uploads'){
            const body=JSON.parse(init.body);identity=body.id
            return Response.json({id:identity,offsets,expiresAt:new Date(Date.now()+UPLOAD_LIFETIME).toISOString(),completed:!!result,result})
        }
        if(url.endsWith('/complete')){result={success:true,uploadedCount:1};if(completionLost){completionLost=false;throw new TypeError('lost response')}return Response.json(result)}
        const index=Number(url.split('/').at(-1)),offset=Number(init.headers['Upload-Offset'])
        offsets[index]=Math.max(offsets[index],offset+init.body.size)
        if(lost){lost=false;throw new TypeError('connection reset after accepted chunk')}
        return Response.json({id:identity,offsets:[...offsets],expiresAt:new Date(Date.now()+UPLOAD_LIFETIME).toISOString(),completed:false,result:null})
    }
    const source=read('app/utils/resumableUpload.ts')
    const ast=ts.createSourceFile('client.ts',source,ts.ScriptTarget.Latest)
    const stripped=ts.factory.updateSourceFile(ast,ast.statements.filter(node=>!ts.isImportDeclaration(node)))
    const code=ts.transpileModule(ts.createPrinter().printFile(stripped).replaceAll('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
    const env={reactive:value=>value,UPLOAD_CHUNK_SIZE,UPLOAD_LIFETIME,parseUploadManifest,parseSender,crypto:webcrypto,localStorage:storage,fetch:request,navigator:{onLine:true},setTimeout:(cb)=>setTimeout(cb,0),clearTimeout}
    const upload=new Function(...Object.keys(env),code+';return uploadResumably')(...Object.values(env))
    return {upload,calls,storage,offsets}
}
test('lost chunk and completion responses retry the same session without restarting or duplicating the file',async()=>{
    const f=clientFixture({failChunk:true,lostCompletion:true}),file=new File([Buffer.alloc(UPLOAD_CHUNK_SIZE+7,42)],'sample.bin')
    const result=await f.upload([file],{kind:'files',scope:'user1',label:'File'})
    assert.equal(result.uploadedCount,1)
    assert.deepEqual(f.calls.filter(c=>c.method==='PUT').map(c=>c.offset),['0','0',String(UPLOAD_CHUNK_SIZE)])
    assert.equal(f.calls.filter(c=>c.url.endsWith('/complete')).length,2)
    assert.equal(f.calls.filter(c=>c.url==='/api/uploads').length,1)
})
test('reselected files resume from the server offset and do not send an accepted prefix again',async()=>{
    const f=clientFixture({initialOffsets:[UPLOAD_CHUNK_SIZE]}),file=new File([Buffer.alloc(UPLOAD_CHUNK_SIZE+17,3)],'sample.bin')
    await f.upload([file],{kind:'files',scope:'user1',label:'File'})
    assert.deepEqual(f.calls.filter(c=>c.method==='PUT').map(c=>c.offset),[String(UPLOAD_CHUNK_SIZE)])
})
test('new preview, draft, sender and recovery templates compile with their actual script bindings',()=>{
    for(const filename of ['app/components/ui/QuickPreviewScope.vue','app/components/ui/FileQuickPreview.vue','app/components/ui/UploadRecoveryNotice.vue','app/components/inbox/FileRequestForm.vue','app/pages/request/[token].vue']){
        const {descriptor}=parse(read(filename)),script=compileScript(descriptor,{id:'features'})
        assert.deepEqual(compileTemplate({source:descriptor.template.content,filename,id:'features',compilerOptions:{bindingMetadata:script.bindings}}).errors,[])
    }
})
