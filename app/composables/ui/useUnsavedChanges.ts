import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

export const useUnsavedChanges = (dirty: Ref<boolean>, saving: Ref<boolean>) => {
    const { confirm } = useConfirm()

    onBeforeRouteLeave(async () => {
        if (saving.value) return false
        if (!dirty.value) return true

        const discard = await confirm({
            title: 'Unsaved changes',
            message: 'Your changes will be lost if you leave this page.',
            confirmText: 'Discard changes',
            cancelText: 'Keep editing',
            variant: 'neutral'
        })

        return discard && !saving.value
    })

    useEventListener('beforeunload', (event: BeforeUnloadEvent) => {
        if (!dirty.value && !saving.value) return

        event.preventDefault()
        event.returnValue = ''
    })
}
