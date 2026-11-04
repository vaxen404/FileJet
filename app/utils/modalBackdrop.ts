// A drag from a field to the backdrop also produces a click on the dialog.
// Dismiss only when both the press and release happened on the backdrop.
export function modalBackdrop(close: () => void) {
    let pressed = false
    let released = false
    const outside = (event: MouseEvent) => {
        const element = event.currentTarget as HTMLElement | null
        if (!element || event.target !== element) return false
        if (element.tagName !== 'DIALOG') return true
        const bounds = element.getBoundingClientRect()
        return event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom
    }
    return {
        pointerdown: (event: PointerEvent) => {
            pressed = event.button === 0 && event.isPrimary !== false && outside(event)
            released = false
        },
        pointerup: (event: PointerEvent) => { released = pressed && outside(event) },
        pointercancel: () => { pressed = released = false },
        click: (event: MouseEvent) => {
            const dismiss = pressed && released && outside(event)
            pressed = released = false
            if (dismiss) close()
        }
    }
}
