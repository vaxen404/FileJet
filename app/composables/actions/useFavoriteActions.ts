type FavoriteType = 'file' | 'folder' | 'note'

export const useFavoriteActions = () => {
    const addFavorite = async (itemId: string, itemType: FavoriteType) => {
        const url: string = '/api/favorites'

        await $fetch(url, {
            method: 'POST',
            body: {
                itemId,
                itemType
            }
        })
    }

    const removeFavorite = async (itemId: string, itemType: FavoriteType) => {
        const url: string = `/api/favorites/${itemType}/${encodeURIComponent(itemId)}`

        await $fetch(url, {
            method: 'DELETE'
        })
    }

    return {
        addFavorite,
        removeFavorite
    }
}
