import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diffNoteLines } from '../shared/utils/noteDiff.ts'
test('note comparison preserves indentation, blank lines, Unicode and original/current order', () => {
    const before = 'Heading\n\n    code  \nOld 📝\nEnd', after = 'Heading\n\n    code  \nNew Türkçe 📝\nEnd'
    const result = diffNoteLines(before,after)
    assert.equal(result.truncated,false)
    assert.equal(result.lines.filter(line => line.kind !== 'added').map(line => line.text).join('\n'),before)
    assert.equal(result.lines.filter(line => line.kind !== 'removed').map(line => line.text).join('\n'),after)
    assert.ok(result.lines.some(line => line.kind === 'removed' && line.text === 'Old 📝'))
    assert.ok(result.lines.some(line => line.kind === 'added' && line.text === 'New Türkçe 📝'))
})
test('comparison stays bounded for large notes and marks limited previews', () => {
    const result = diffNoteLines('x'.repeat(300000), 'y'.repeat(300000))
    assert.equal(result.truncated,true)
    assert.ok(result.lines.every(line => line.text.length <= 4000))
    const many = diffNoteLines(Array.from({length:1000},(_,i)=>'old'+i).join('\n'),Array.from({length:1000},(_,i)=>'new'+i).join('\n'))
    assert.equal(many.lines.length,2000)
    assert.ok(many.lines.slice(0,1000).every(line=>line.kind==='removed'))
    assert.ok(many.lines.slice(1000).every(line=>line.kind==='added'))
})
