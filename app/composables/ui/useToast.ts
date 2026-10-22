interface ToastOptions {
    duration?: number
    action?: {
        label: string
        variant?: 'trash-undo'
        run: () => Promise<void>
    }
}

interface ToastEntry {
    id: string
    message: string
    type: 'success' | 'error'
    actionLabel: string | null
    actionVariant: 'trash-undo' | null
    pending: boolean
    expiresAt: number
}

const toastRuntimes = new WeakMap<
    object,
    {
        actions: Map<string, () => Promise<void>>
        timers: Map<string, ReturnType<typeof setTimeout>>
    }
>()

export const useToast = () => {
    const app = useNuxtApp()
    const toasts = useState<ToastEntry[]>('toasts', () => [])

    if (!toastRuntimes.has(app)) {
        toastRuntimes.set(app, { actions: new Map(), timers: new Map() })
    }

    const runtime = toastRuntimes.get(app)!

    const closeToast = (id: string) => {
        clearTimeout(runtime.timers.get(id))
        runtime.timers.delete(id)
        runtime.actions.delete(id)
        toasts.value = toasts.value.filter(toast => toast.id !== id)
    }

    const schedule = (toast: ToastEntry) => {
        if (!import.meta.client) return

        clearTimeout(runtime.timers.get(toast.id))
        runtime.timers.set(
            toast.id,
            setTimeout(() => closeToast(toast.id), Math.max(0, toast.expiresAt - Date.now()))
        )
    }

    const openToast = (message: string, type: 'success' | 'error', options: ToastOptions = {}) => {
        const toast: ToastEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            message,
            type,
            actionLabel: options.action?.label ?? null,
            actionVariant: options.action?.variant ?? null,
            pending: false,
            expiresAt: Date.now() + (options.duration ?? 3000)
        }

        if (options.action) runtime.actions.set(toast.id, options.action.run)

        toasts.value.push(toast)
        schedule(toast)

        return toast.id
    }

    const runToastAction = async (id: string) => {
        const toast = toasts.value.find(item => item.id === id)
        const action = runtime.actions.get(id)

        if (!toast || toast.pending || !action) return

        if (Date.now() >= toast.expiresAt) {
            closeToast(id)

            return
        }

        toast.pending = true
        clearTimeout(runtime.timers.get(id))

        try {
            await action()
            closeToast(id)
        } catch (error: any) {
            toast.pending = false
            openToast(
                error.data?.message || error.message || 'The action could not be completed.',
                'error'
            )
            schedule(toast)
        }
    }

    const resumeToasts = () => {
        toasts.value.forEach(schedule)
    }

    const latestToast = computed(() => toasts.value.at(-1))

    return {
        toasts,
        toastMessage: computed(() => latestToast.value?.message ?? ''),
        toastType: computed(() => latestToast.value?.type ?? 'success'),
        showToast: computed(() => toasts.value.length > 0),
        openToast,
        closeToast,
        runToastAction,
        resumeToasts
    }
}
