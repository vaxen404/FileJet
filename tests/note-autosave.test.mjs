import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ref, effectScope } from 'vue'
import { setTimeout as sleep } from 'node:timers/promises'
import { useNoteAutosave } from '../app/composables/ui/useNoteAutosave.ts'

const fixture = (t, write) => {
    const scope = effectScope(), calls = [], saved = []
    const note = ref({ title: 'Original', content: 'Saved', updated_at: 'v1' })
    let version = 1
    const state = scope.run(() => useNoteAutosave({ note, delay: 20,
        validate: value => value.title.trim() && value.content.trim() ? null : 'Title and content required',
        write: async value => { calls.push(value); return write ? write(value) : { ...value, title: value.title.trim(), updated_at: 'v' + ++version } },
        saved: value => saved.push(value)
    }))
    t.after(() => scope.stop())
    return { ...state, note, calls, saved, stop: () => scope.stop() }
}

test('autosave debounces typing and synchronizes the saved baseline', async t => {
    const f = fixture(t)
    f.draftContent.value = 'First'
    f.draftContent.value = 'Latest'
    await sleep(60)
    assert.equal(f.calls.length, 1)
    assert.equal(f.note.value.content, 'Latest')
    assert.equal(f.calls[0].expectedUpdatedAt, 'v1')
    assert.equal(f.dirty.value, false)
    assert.equal(f.saveStatus.value, 'All changes saved')
})

test('new typing during an in-flight save survives and is saved with the new version token', async t => {
    const resolvers = []
    const f = fixture(t, value => new Promise(resolve => resolvers.push(() => resolve({ ...value, updated_at: 'v' + (f.calls.length + 1) }))))
    f.draftContent.value = 'Snapshot'
    const request = f.flush()
    f.draftContent.value = 'Newer typing'
    assert.equal(f.isSaving.value, true)
    resolvers.shift()()
    await sleep(0)
    assert.equal(f.draftContent.value, 'Newer typing')
    assert.equal(f.calls.length, 2)
    assert.equal(f.calls[1].expectedUpdatedAt, 'v2')
    resolvers.shift()()
    assert.equal(await request, true)
    assert.equal(f.note.value.content, 'Newer typing')
})

test('save conflicts retain the draft, stop automatic retries and allow an explicit retry', async t => {
    let fail = true
    const f = fixture(t, async value => { if (fail) throw { data: { message: 'Changed in another session' } }; return { ...value, updated_at: 'v2' } })
    f.draftContent.value = 'Keep this draft'
    await sleep(60)
    assert.equal(f.note.value.content, 'Saved')
    assert.equal(f.draftContent.value, 'Keep this draft')
    assert.equal(f.saveError.value, 'Changed in another session')
    await sleep(60)
    assert.equal(f.calls.length, 1)
    fail = false
    assert.equal(await f.flush(), true)
    assert.equal(f.dirty.value, false)
})

test('temporary empty fields do not save or prevent later valid edits from autosaving', async t => {
    const f = fixture(t)
    f.draftTitle.value = ''
    await sleep(40)
    assert.equal(f.calls.length, 0)
    f.draftTitle.value = '  Valid title  '
    await sleep(60)
    assert.equal(f.calls.length, 1)
    assert.equal(f.draftTitle.value, 'Valid title')
    assert.equal(f.dirty.value, false)
})

test('discard cancels a pending save and disposal stops background requests', async t => {
    const f = fixture(t)
    f.draftContent.value = 'Discard'
    f.discard()
    await sleep(50)
    assert.equal(f.calls.length, 0)
    assert.equal(f.draftContent.value, 'Saved')
    f.draftContent.value = 'Dispose before saving'
    f.stop()
    await sleep(50)
    assert.equal(f.calls.length, 0)
})
