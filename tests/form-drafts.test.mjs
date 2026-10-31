import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFormDraft, writeFormDraft } from '../app/utils/formDraft.ts'
import { inboxDraftSchema } from '../shared/schemas/inboxDraft.ts'
test('Inbox drafts persist per account and Inbox and can be discarded', () => {
    const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
    const valid = value => inboxDraftSchema.safeParse(value).success
    const draft = { title: 'Proposal', description: 'Review files', folderId: '', maxSize: 10, maxFiles: 100, expiryDays: 7 }
    assert.equal(writeFormDraft(storage, 'user1:new', draft), true)
    assert.deepEqual(readFormDraft(storage, 'user1:new', valid), draft)
    assert.equal(readFormDraft(storage, 'user2:new', valid), null)
    assert.equal(readFormDraft(storage, 'user1:edit', valid), null)
    writeFormDraft(storage, 'user1:new', null)
    assert.equal(readFormDraft(storage, 'user1:new', valid), null)
    storage.setItem('old', JSON.stringify({ version: 1, savedAt: Date.now() - 8 * 86400000, value: draft }))
    assert.equal(readFormDraft(storage, 'old', valid), null)
    storage.setItem('broken', '{oops')
    assert.equal(readFormDraft(storage, 'broken', valid), null)
    assert.equal(readFormDraft(null, 'x', valid), null)
})
