import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { parseUploadManifest } from '../shared/utils/resumableUpload.ts'
import { summarizeStorageUsage } from '../server/utils/storageUsage.ts'
test('replacement uploads require one file, an owned-file ID and an explicit current revision', () => {
    const manifest = { kind: 'files', replaceFileId: '00000000-0000-0000-0000-000000000001', expectedRevision: 2, files: [{ name: 'a.txt', path: 'a.txt', type: 'text/plain', size: 0, hashes: [] }] }
    assert.equal(parseUploadManifest(manifest).expectedRevision, 2)
    for (const patch of [{ expectedRevision: undefined }, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { replaceFileId: 'foreign' }, { kind: 'notes' }, { files: [manifest.files[0], manifest.files[0]] }]) assert.throws(() => parseUploadManifest({ ...manifest, ...patch }))
})
test('storage categories include saved revisions together with live and trashed file bytes', () => {
    const group = (mime_type, size) => ({ mime_type, _sum: { size } })
    const result = summarizeStorageUsage({ limit: 1000n, files: [group('text/plain', 10n)], notes: 0n, trash: [{ ...group('image/png', 20n), item_type: 'file' }], versions: [group('text/plain', 30n), group('image/png', 40n)] })
    assert.equal(result.storageUsed, '100')
    assert.equal(result.categories.images, '60')
    assert.equal(result.categories.documents, '40')
})
test('the version history panel compiles with its upload and restore bindings', () => {
    const filename = 'app/components/ui/FileVersionHistory.vue', { descriptor } = parse(readFileSync(new URL('../'+filename, import.meta.url), 'utf8'))
    const script = compileScript(descriptor, { id: 'versions' })
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'versions', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
})
