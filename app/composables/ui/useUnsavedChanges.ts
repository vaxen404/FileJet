import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

export const useUnsavedChanges = (dirty: Ref<boolean>, saving: Ref<boolean>) => {
    onBeforeRouteLeave(() => {
        if (saving.value) return false

        return !dirty.value || window.confirm('Discard unsaved changes?')
    })

    useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
        if (!dirty.value && !saving.value) return

        event.preventDefault()
        event.returnValue = ''
    })
}
