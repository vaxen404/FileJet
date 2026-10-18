export const useUpload = (url: string, label: string) => {
    const uploads = reactive(
        new Map<symbol, { loaded: number, total: number | null, transferred: boolean }>()
    )
    const isUploading = computed(() => uploads.size > 0)
    const isProcessing = computed(
        () => uploads.size > 0 && [...uploads.values()].every(upload => upload.transferred)
    )
    const uploadProgress = computed(() => {
        if (isProcessing.value) return 100
        let loaded = 0
        let total = 0
        for (const upload of uploads.values()) {
            if (upload.total === null) return null
            loaded += upload.loaded
            total += upload.total
        }
        return total > 0 ? Math.min(99, Math.max(0, Math.floor(loaded / total * 100))) : null
    })
    const upload = async (files: FileList | File[], onSuccess?: () => Promise<void>) => {
        if (!files.length) return
        const id = Symbol()
        uploads.set(id, { loaded: 0, total: null, transferred: false })
        try {
            const formData = new FormData()
            Array.from(files).forEach(file => formData.append('files', file))
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.onprogress = event => {
                    const total = event.lengthComputable && event.total > 0 ? event.total : null
                    uploads.set(id, {
                        loaded: event.loaded,
                        total,
                        transferred: total !== null && event.loaded >= total
                    })
                }
                xhr.upload.onload = () => {
                    const state = uploads.get(id)!
                    uploads.set(id, {
                        ...state,
                        loaded: state.total ?? state.loaded,
                        transferred: true
                    })
                }
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const state = uploads.get(id)!
                        uploads.set(id, { ...state, transferred: true })
                        resolve()
                    } else
                        reject(
                            new Error(
                                xhr.response?.message ||
                                    xhr.response?.data?.message ||
                                    xhr.response?.statusMessage ||
                                    `${label} upload failed.`
                            )
                        )
                }
                xhr.onerror = () => reject(new Error(`${label} upload failed.`))
                xhr.onabort = () => reject(new Error(`${label} upload cancelled.`))
                xhr.ontimeout = () => reject(new Error(`${label} upload timed out.`))
                xhr.open('POST', url)
                xhr.responseType = 'json'
                xhr.setRequestHeader('Accept', 'application/json')
                xhr.send(formData)
            })
            await onSuccess?.()
        } finally {
            uploads.delete(id)
        }
    }
    return { isUploading, isProcessing, uploadProgress, upload }
}
