import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSender } from '../shared/utils/sender.ts'
test('sender name and note are optional, trimmed, bounded and stored as plain text', () => {
    assert.deepEqual(parseSender({}), { senderName: '', senderNote: '' })
    assert.deepEqual(parseSender({ senderName: ' Deniz ', senderNote: ' Please review.\n<script>text</script> ' }), { senderName: 'Deniz', senderNote: 'Please review.\n<script>text</script>' })
    for (const input of [{ senderName: 'x'.repeat(101) }, { senderNote: 'x'.repeat(1001) }, { senderName: [] }, { senderNote: {} }]) assert.throws(() => parseSender(input))
})
