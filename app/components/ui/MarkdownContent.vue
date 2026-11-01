<template>
    <div class="markdown-content min-w-0 text-sm leading-7 text-content" v-html="html" />
</template>
<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'
const props = defineProps<{ content: string }>()
const html = computed(() => renderMarkdown(props.content))
</script>
<style scoped>
.markdown-content { overflow-wrap: anywhere; }
.markdown-content :deep(> :first-child) { margin-top: 0; }
.markdown-content :deep(> :last-child) { margin-bottom: 0; }
.markdown-content :deep(p), .markdown-content :deep(ul), .markdown-content :deep(ol), .markdown-content :deep(blockquote), .markdown-content :deep(pre), .markdown-content :deep(.markdown-table) { margin: 0 0 1rem; }
.markdown-content :deep(h1), .markdown-content :deep(h2), .markdown-content :deep(h3), .markdown-content :deep(h4), .markdown-content :deep(h5), .markdown-content :deep(h6) { margin: 1.5rem 0 .75rem; color: var(--color-foreground); font-weight: 600; line-height: 1.4; }
.markdown-content :deep(h1) { font-size: 1.75rem; }
.markdown-content :deep(h2) { font-size: 1.4rem; }
.markdown-content :deep(h3) { font-size: 1.15rem; }
.markdown-content :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.markdown-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.markdown-content :deep(li > ul), .markdown-content :deep(li > ol) { margin-bottom: 0; }
.markdown-content :deep(li + li) { margin-top: .25rem; }
.markdown-content :deep(a) { color: var(--color-accent); text-decoration: underline; text-underline-offset: 3px; }
.markdown-content :deep(a:focus-visible) { outline: 2px solid var(--color-accent); outline-offset: 3px; }
.markdown-content :deep(blockquote) { border-left: 3px solid var(--color-control-border); padding: .25rem 0 .25rem 1rem; color: var(--color-muted); }
.markdown-content :deep(blockquote > :last-child) { margin-bottom: 0; }
.markdown-content :deep(code) { border-radius: .25rem; background: var(--color-control); padding: .15rem .3rem; font-family: monospace; font-size: .85em; }
.markdown-content :deep(pre) { max-width: 100%; overflow-x: auto; border: 1px solid var(--color-divider); border-radius: .6rem; background: var(--color-canvas); padding: 1rem; line-height: 1.6; }
.markdown-content :deep(pre code) { background: transparent; padding: 0; }
.markdown-content :deep(.markdown-table) { max-width: 100%; overflow-x: auto; }
.markdown-content :deep(table) { border-collapse: collapse; width: 100%; }
.markdown-content :deep(th), .markdown-content :deep(td) { border: 1px solid var(--color-control-border); padding: .5rem .75rem; text-align: left; }
.markdown-content :deep(th) { background: var(--color-control); font-weight: 600; }
.markdown-content :deep(hr) { margin: 1.5rem 0; border: 0; border-top: 1px solid var(--color-divider); }
.markdown-content :deep(img) { max-width: 100%; height: auto; border-radius: .5rem; }
</style>
