
export const useFileActions = () => {
    const isLoading = ref(false)
    
    const uploadProgress = ref(0)
    const activeRequests = ref(0)

    const startLoading = () => {
        activeRequests.value++
        isLoading.value = true
    }

    const stopLoading = () => {
        activeRequests.value = Math.max(0, activeRequests.value - 1)
        isLoading.value = activeRequests.value > 0
    }

    const uploadFiles = (files: FileList | File[]) => {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData()

            Array.from(files).forEach((file) => {
                formData.append('files', file)
            })

            startLoading()
            uploadProgress.value = 0

            const xhr = new XMLHttpRequest()

            xhr.open('POST', '/api/files/add')
            xhr.responseType = 'json'
            xhr.setRequestHeader('Accept', 'application/json')

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return

                uploadProgress.value = Math.round(
                    (event.loaded / event.total) * 100
                )
            }

            xhr.onload = () => {
                stopLoading()

                if (xhr.status >= 200 && xhr.status < 300) {
                    uploadProgress.value = 100
                    resolve()
                    return
                }

                const message =
                    xhr.response?.message ||
                    xhr.response?.data?.message ||
                    xhr.response?.statusMessage ||
                    'File upload failed'

                reject(new Error(message))
            }

            xhr.onerror = () => {
                stopLoading()
                reject(new Error('File upload failed'))
            }

            xhr.onabort = () => {
                stopLoading()
                reject(new Error('File upload cancelled'))
            }

            try {
                xhr.send(formData)
            } catch (error) {
                stopLoading()
                reject(error)
            }
        })
    }

    const deleteFile = async (fileId: string) => {
        startLoading()

        try {
            await $fetch('/api/files/delete', {
                method: 'POST',
                body: {
                    fileId
                }
            })
        } finally {
            stopLoading()
        }
    }

    const renameFile = async (
        fileId: string,
        newName: string
    ) => {
        startLoading()

        try {
            await $fetch('/api/files/rename', {
                method: 'POST',
                body: {
                    fileId,
                    newName
                }
            })
        } finally {
            stopLoading()
        }
    }

    const downloadFile = (fileId: string) => {
        const link = document.createElement('a')

        link.href = `/api/files/download?fileId=${encodeURIComponent(fileId)}`
        link.download = ''

        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    return {
        isLoading,
        uploadProgress,
        uploadFiles,
        deleteFile,
        renameFile,
        downloadFile
    }
}
