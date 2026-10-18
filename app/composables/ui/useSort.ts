type SortMode =
    | 'newest' | 'oldest' | 'name-asc' | 'name-desc'

export const useSort = <T>(
    items: Ref<T[]>,
    sortMode: Ref<SortMode>,
    getName: (item: T) => string,
    getDate: (item: T) => string | null
) => {
    const sortedItems = computed<T[]>(() => {
        const list = [...items.value]

        if (sortMode.value === 'newest') {
            return list.sort((a, b) => {
                return new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime()
            })
        }

        if (sortMode.value === 'oldest') {
            return list.sort((a, b) => {
                return new Date(getDate(a) ?? 0).getTime() - new Date(getDate(b) ?? 0).getTime()
            })
        }

        if (sortMode.value === 'name-asc') {
            return list.sort((a, b) => {
                return getName(a).localeCompare(getName(b))
            })
        }

        return list.sort((a, b) => {
            return getName(b).localeCompare(getName(a))
        })
    })

    return {
        sortedItems
    }
}
