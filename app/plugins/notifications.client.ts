import { getStorageStatus } from '~/utils/notifications'

export default defineNuxtPlugin(() => {
    const currentUser = useAuthUser()
    const { user } = useUser()
    const { loadNotifications, addNotification } = useNotifications()

    onNuxtReady(() => {
        watch(() => currentUser.value?.id, loadNotifications, { immediate: true })
        watch(() => {
            const account = currentUser.value
            const profile = user.value?.id === account?.id ? user.value : account
            return [account?.id, profile?.storageUsed, profile?.storageLimit] as const
        }, () => {
            const account = currentUser.value
            if (!account) return
            const profile = user.value?.id === account.id ? user.value : account
            const status = getStorageStatus(profile.storageUsed, profile.storageLimit)
            if (status.level === 'normal') return
            addNotification({
                title: status.level === 'full' ? 'Storage limit reached' : 'Your storage is almost full',
                message: status.level === 'full' ? 'Free up some space before uploading more files.' : `${Math.floor(status.percent)}% of your storage is in use. Review your files or empty items you no longer need.`,
                kind: 'warning', category: 'storage', href: '/home',
                dedupeKey: `storage:${status.level}:${new Date().toISOString().slice(0, 10)}`
            }, account.id)
        }, { immediate: true })
    })
})
