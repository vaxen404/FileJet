import MarkdownIt from 'markdown-it'

// Keep raw note HTML inert; the parser also rejects unsafe link/image protocols.
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true })
markdown.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
    tokens[index]!.attrSet('target', '_blank')
    tokens[index]!.attrSet('rel', 'noopener noreferrer')
    return renderer.renderToken(tokens, index, options)
}
markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const token = tokens[index]!
    token.attrSet('alt', renderer.renderInlineAsText(token.children ?? [], options, env))
    token.attrSet('loading', 'lazy')
    token.attrSet('referrerpolicy', 'no-referrer')
    return renderer.renderToken(tokens, index, options)
}
markdown.renderer.rules.table_open = () => '<div class="markdown-table"><table>\n'
markdown.renderer.rules.table_close = () => '</table></div>\n'

export const renderMarkdown = (content: string) => markdown.render(content)
