let toastTimeout: ReturnType<typeof setTimeout> | undefined

export const useToast = () => {
    const toastMessage = useState('toast-message', () => '')
    const toastType = useState<'success' | 'error'>(
        'toast-type',
        () => 'success'
    )

    const showToast = useState('toast-show', () => false)

    const openToast = (
        message: string,
        type: 'success' | 'error'
    ) => {
        toastMessage.value = message
        toastType.value = type
        showToast.value = true

        if (!import.meta.client) return

        clearTimeout(toastTimeout)
        toastTimeout = setTimeout(() => {
            showToast.value = false
            toastTimeout = undefined
        }, 3000)
    }

    return {
        toastMessage,
        toastType,
        showToast,
        openToast
    }
}
