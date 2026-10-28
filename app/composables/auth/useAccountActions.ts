export const useAccountActions = () => {
    const currentUser = useAuthUser()
    const isSigningOut = useState<boolean>('account-signing-out', () => false)
    const { confirm } = useConfirm()
    const { openToast } = useToast()

    const requestLogout = async () => {
        if (isSigningOut.value) return

        const accepted = await confirm({
            title: 'Log out?',
            message: 'Are you sure you want to log out of your account?',
            confirmText: 'Log out',
            cancelText: 'Stay signed in',
            variant: 'danger'
        })

        if (!accepted || isSigningOut.value) return

        isSigningOut.value = true

        try {
            await $fetch('/api/auth/logout', { method: 'POST' })
        } catch {
            isSigningOut.value = false
            openToast('Could not log out. Please try again.', 'error')
            return
        }

        currentUser.value = null
        openToast('Logged out successfully', 'success')

        try {
            await navigateTo('/login')
        } finally {
            isSigningOut.value = false
        }
    }

    return { isSigningOut, requestLogout }
}
