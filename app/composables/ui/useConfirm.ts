type Confirmation = {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'neutral'
}

const pendingConfirmations = new WeakMap<object, {
    promise: Promise<boolean>
    resolve: (confirmed: boolean) => void
}>()

export const useConfirm = () => {
    const app = useNuxtApp()
    const confirmation = useState<Confirmation | null>('confirmation', () => null)

    const confirm = (options: Confirmation): Promise<boolean> => {
        if (!import.meta.client) return Promise.resolve(false)

        const pending = pendingConfirmations.get(app)

        if (pending) return pending.promise

        let resolve!: (confirmed: boolean) => void
        const promise = new Promise<boolean>(done => { resolve = done })

        pendingConfirmations.set(app, { promise, resolve })
        confirmation.value = { ...options }

        return promise
    }

    const resolveConfirm = (confirmed: boolean) => {
        const pending = pendingConfirmations.get(app)

        pendingConfirmations.delete(app)
        confirmation.value = null
        pending?.resolve(confirmed)
    }

    return { confirmation, confirm, resolveConfirm }
}
