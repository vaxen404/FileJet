import { getFileReturnPage } from '~/utils/fileNavigation'

export default defineNuxtRouteMiddleware((to, from) => {
    if (to.query.from !== undefined) return

    const source = getFileReturnPage(from.fullPath)

    if (!source) return

    return navigateTo({
        path: to.path,
        query: { ...to.query, from: source.path },
        hash: to.hash
    })
})
