export const useFileDrop = (onDrop: (event: DragEvent) => void, enabled: () => boolean = () => true) => {
    const isDragging = ref(false)
    let depth = 0
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
        || Array.from(event.dataTransfer?.items ?? []).some(item => item.kind === 'file')
    const reset = () => { depth = 0; isDragging.value = false }
    const dragenter = (event: DragEvent) => {
        if (!enabled() || !hasFiles(event)) return
        event.preventDefault()
        depth++
        isDragging.value = true
    }
    const dragover = (event: DragEvent) => {
        if (!enabled() || !hasFiles(event)) return
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        depth = Math.max(1, depth)
        isDragging.value = true
    }
    const dragleave = (event: DragEvent) => {
        if (!isDragging.value) return
        event.preventDefault()
        depth = Math.max(0, depth - 1)
        if (!depth) reset()
    }
    const drop = (event: DragEvent) => {
        reset()
        if (!enabled() || !hasFiles(event)) return
        event.preventDefault()
        if (event.dataTransfer?.files.length) onDrop(event)
    }
    const preventNavigation = (event: DragEvent) => {
        if (enabled() && hasFiles(event)) event.preventDefault()
        if (event.type === 'drop') reset()
    }
    const leaveWindow = (event: DragEvent) => {
        if (!event.relatedTarget && (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight)) reset()
    }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') reset() }
    onMounted(() => {
        window.addEventListener('dragover', preventNavigation, true)
        window.addEventListener('drop', preventNavigation, true)
        window.addEventListener('dragleave', leaveWindow)
        window.addEventListener('dragend', reset)
        window.addEventListener('blur', reset)
        window.addEventListener('keydown', keydown)
    })
    onBeforeUnmount(() => {
        window.removeEventListener('dragover', preventNavigation, true)
        window.removeEventListener('drop', preventNavigation, true)
        window.removeEventListener('dragleave', leaveWindow)
        window.removeEventListener('dragend', reset)
        window.removeEventListener('blur', reset)
        window.removeEventListener('keydown', keydown)
        reset()
    })
    return { isDragging, dragenter, dragover, dragleave, drop }
}
