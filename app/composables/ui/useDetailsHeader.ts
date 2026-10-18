import type { Ref } from 'vue'

export const useDetailsHeader = (
    type: 'note' | 'folder',
    id: string,
    title: Ref<string>,
    back: Ref<{ path: string; name: string }>
) => {
    const header = useFileHeader()

    watch(
        [title, back],
        ([fileName, returnPage]) => {
            header.value = {
                fileId: id,
                fileName,
                returnName: returnPage.name,
                returnPath: returnPage.path,
                itemType: type
            }
        },
        { immediate: true }
    )

    onBeforeUnmount(() => {
        if (header.value?.fileId === id && header.value.itemType === type) header.value = null
    })
}
