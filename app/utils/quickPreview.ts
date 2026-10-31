export function canQuickPreview(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    return event.code === 'Space' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
        !target?.closest('input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"], [role="textbox"], dialog, video, audio')
}
