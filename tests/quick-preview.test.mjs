import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { canQuickPreview } from '../app/utils/quickPreview.ts'
test('Space opens quick preview while editing, controls, media, modifiers and repeats retain their keyboard behavior', () => {
    const key = { code: 'Space', target: { closest: () => null } }
    assert.equal(canQuickPreview(key), true)
    for (const override of [{ code: 'Enter' }, { repeat: true }, { altKey: true }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { target: { closest: () => ({}) } }]) assert.equal(canQuickPreview({ ...key, ...override }), false)
})
test('quick preview components compile with their actual script bindings', () => {
    for (const filename of ['app/components/ui/QuickPreviewScope.vue', 'app/components/ui/FileQuickPreview.vue']) {
        const { descriptor } = parse(readFileSync(new URL('../'+filename, import.meta.url), 'utf8'))
        const script = compileScript(descriptor, { id: 'preview' })
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'preview', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
    }
})
