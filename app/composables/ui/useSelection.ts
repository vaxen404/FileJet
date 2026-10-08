export const useSelection = <T extends { id: string }>(
    items: Ref<T[]>
) => {
    const selectedItems = ref<string[]>([])

    const allSelected = computed(() => {
        return items.value.length > 0 &&
            items.value.every(item => {
                return selectedItems.value.includes(item.id)
            })
    })

    const toggleSelectAll = (event: Event) => {
        const checked = (event.target as HTMLInputElement).checked

        if (checked) {
            selectedItems.value = items.value.map(item => item.id)
        } else {
            selectedItems.value = []
        }
    }
    
    return {
        selectedItems,
        allSelected,
        toggleSelectAll
    }
}