export const useSelection = <T extends { id: string }>(items: Ref<T[]>) => {
    const selectedItems = ref<string[]>([])

    const allSelected = computed(() =>
        items.value.length > 0 &&
        items.value.every(item => selectedItems.value.includes(item.id))
    )

    const toggleSelectAll = (event: Event) => {
        const checked = (event.target as HTMLInputElement).checked

        selectedItems.value = checked ? items.value.map(item => item.id) : []
    }

    return {
        selectedItems,
        allSelected,
        toggleSelectAll
    }
}
