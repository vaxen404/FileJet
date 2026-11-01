<template>
    <div class="markdown-editor flex min-h-0 min-w-0 flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <label :for="id" class="text-sm font-medium text-foreground">Content</label>
            <div class="flex gap-1 rounded-lg border border-control-border bg-control p-1" aria-label="Markdown editor mode">
                <button v-for="mode in modes" :key="mode.label" type="button" :aria-pressed="preview === mode.value" :disabled="disabled" class="cursor-pointer rounded-md px-3 py-1 text-xs text-muted hover:text-foreground disabled:cursor-wait" :class="{ 'bg-raised text-foreground': preview === mode.value }" @click="preview = mode.value">{{ mode.label }}</button>
            </div>
        </div>
        <textarea v-show="!preview" :id="id" v-model="content" :required="!preview" :disabled="disabled" :rows="rows" :aria-describedby="`${id}-help`" class="min-h-40 w-full min-w-0 flex-1 resize-y rounded-md border border-control-border bg-control p-3 font-mono text-sm leading-7 text-content outline-none focus:border-accent disabled:cursor-wait disabled:opacity-60" placeholder="Write your note in Markdown…" spellcheck="true" />
        <div v-if="preview" class="markdown-editor-preview min-h-40 min-w-0 flex-1 overflow-auto rounded-md border border-control-border bg-control p-3" role="region" aria-label="Markdown preview">
            <MarkdownContent v-if="content.trim()" :content="content" />
            <p v-else class="text-sm text-muted">Nothing to preview yet.</p>
        </div>
        <p :id="`${id}-help`" class="text-xs leading-5 text-muted">Markdown supported: # heading, **bold**, - list, `code`, [link](url).</p>
    </div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ id: string; disabled?: boolean; rows?: number }>(), { rows: 8 })
const content = defineModel<string>({ required: true })
const preview = ref(false)
const modes = [{ value: false, label: 'Write' }, { value: true, label: 'Preview' }]
</script>
