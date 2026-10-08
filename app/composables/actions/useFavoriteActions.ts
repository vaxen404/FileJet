type FavoriteType = 'file' | 'folder' | 'note'

export const useFavoriteActions = () => {
    const addFavorite = async (
        itemId: string,
        itemType: FavoriteType
    ) => {
        await $fetch('/api/favorites/add', {
            method: 'POST',
            body: {
                itemId,
                itemType
            }
        })
    }

    const removeFavorite = async (
        itemId: string,
        itemType: FavoriteType
    ) => {
        await $fetch('/api/favorites/remove', {
            method: 'POST',
            body: {
                itemId,
                itemType
            }
        })
    }

    return {
        addFavorite,
        removeFavorite
    }
}