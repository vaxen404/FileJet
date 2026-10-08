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

        setTimeout(() => {
            showToast.value = false
        }, 3000);
    }

    return {
        toastMessage,
        toastType,
        showToast,
        openToast
    }
}