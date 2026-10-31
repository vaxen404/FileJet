import type { Ref } from 'vue'
import type { FileJetPreferences } from '~/composables/usePreferences'

export const useBrowsePreferences = (
    viewMode: Ref<FileJetPreferences['defaultView']>,
    sortMode: Ref<FileJetPreferences['defaultSort']>
) => {
    const { preferences } = usePreferences()

    watch([() => preferences.value.defaultView, () => preferences.value.defaultSort], ([view, sort]) => {
        viewMode.value = view
        sortMode.value = sort
    }, { immediate: true })

    const itemsPerPage = computed(() => {
        if (preferences.value.pageSize !== 'auto') return preferences.value.pageSize

        return viewMode.value === 'list' ? 12 : 24
    })

    return { itemsPerPage }
}
