type FavoriteType = 'file' | 'folder' | 'note'

export const useFavoriteActions = () => {
    const addFavorite = async (itemId: string, itemType: FavoriteType) => {
        await $fetch('/api/favorites', {
            method: 'POST',
            body: {
                itemId,
                itemType
            }
        })
    }

    const removeFavorite = async (itemId: string, itemType: FavoriteType) => {
        await $fetch(`/api/favorites/${itemType}/${encodeURIComponent(itemId)}`, {
            method: 'DELETE'
        })
    }

    return {
        addFavorite,
        removeFavorite
    }
}
