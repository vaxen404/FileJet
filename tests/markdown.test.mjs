import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { renderMarkdown } from '../app/utils/markdown.ts'
import { noteSchema } from '../shared/schemas/note.ts'

test('note saves preserve Markdown indentation and hard-break whitespace but reject blank content', () => {
    const content = '    indented code\n\nLine with hard break  \nNext line\n'
    assert.equal(noteSchema.parse({ title: ' Note ', content }).content, content)
    for (const blank of ['', '  \n\t ']) assert.equal(noteSchema.safeParse({ title: 'Note', content: blank }).success, false)
})

test('notes render headings, emphasis, lists, quotes, tables, code and links', () => {
    const html = renderMarkdown('# Plan\n\n**Bold** and *italic* and ~~old~~\n\n- One\n- Two\n\n1. First\n2. Second\n\n> Quote\n\n```js\nconst value = "<safe>"\n```\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n[Docs](https://example.com)')
    for (const fragment of ['<h1>Plan</h1>', '<strong>Bold</strong>', '<em>italic</em>', '<s>old</s>', '<ul>', '<ol>', '<blockquote>', '<code class="language-js">', '&lt;safe&gt;', 'class="markdown-table"', '<th>Name</th>', 'href="https://example.com"', 'rel="noopener noreferrer"', 'target="_blank"']) assert.ok(html.includes(fragment), fragment)
})

test('plain notes retain line breaks, Unicode and escaped literal markup', () => {
    const html = renderMarkdown('Türkçe not 😊\nİkinci satır\n\nSon paragraf <3 & tea')
    assert.match(html, /Türkçe not 😊<br>\nİkinci satır/)
    assert.match(html, /<p>Son paragraf &lt;3 &amp; tea<\/p>/)
    assert.equal(renderMarkdown(''), '')
})

test('raw HTML and unsafe link/image protocols cannot execute in private or shared notes', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<iframe srcdoc="bad"></iframe>\n\n[x](javascript:alert%281%29)\n[x](jav&#x61;script:alert%281%29)\n[x](vbscript:bad)\n[x](data:text/html;base64,PHNjcmlwdD4=)\n![x](data:image/svg+xml;base64,PHN2Zz4=)\n\n```html\n</code><img src=x onerror=alert(1)>\n```')
    assert.doesNotMatch(html, /<script\b|<iframe\b|<img\b|href="(?:javascript|vbscript|data):/i)
    assert.match(html, /&lt;script&gt;/)
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
})

test('images escape attributes and carry lazy loading and referrer protection', () => {
    const html = renderMarkdown('![A **bold** label](https://example.com/image.png "A title")')
    assert.match(html, /alt="A bold label"/)
    assert.match(html, /loading="lazy"/)
    assert.match(html, /referrerpolicy="no-referrer"/)
    assert.match(html, /title="A title"/)
    assert.doesNotMatch(renderMarkdown('![x](https://example.com/\" onerror=\"bad)'), /<img[^>]+ onerror=/)
})

test('rendering notes is deterministic and parser state cannot leak between notes', () => {
    const source = '[reference][private]\n\n[private]: https://example.com/private'
    assert.equal(renderMarkdown(source), renderMarkdown(source))
    assert.doesNotMatch(renderMarkdown('[reference][private]'), /href=/)
})

test('Markdown components and note presentation surfaces compile with actual bindings', () => {
    for (const filename of ['app/components/ui/MarkdownContent.vue', 'app/components/ui/MarkdownEditor.vue', 'app/components/ui/NoteFormModal.vue', 'app/pages/(user)/notes/[noteId].vue', 'app/components/ui/FileQuickPreview.vue', 'app/components/ui/SharedFolderContents.vue', 'app/pages/shared/[token].vue']) {
        const { descriptor } = parse(readFileSync(new URL('../' + filename, import.meta.url), 'utf8'))
        const script = compileScript(descriptor, { id: 'markdown' })
        assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'markdown', compilerOptions: { bindingMetadata: script.bindings } }).errors, [], filename)
    }
})
