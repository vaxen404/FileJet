export const useFileActions = () => {
    const isLoading = ref(false)
    const uploadProgress = ref(0)

    const uploadFiles = (files: FileList | File[]) => {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData()

            Array.from(files).forEach((file) => {
                formData.append('files', file)
            })

            isLoading.value = true
            uploadProgress.value = 0

            const xhr = new XMLHttpRequest()

            xhr.open('POST', '/api/files/add')

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return

                uploadProgress.value = Math.round(
                    (event.loaded / event.total) * 100
                )
            }

            xhr.onload = () => {
                isLoading.value = false

                if (xhr.status >= 200 && xhr.status < 300) {
                    uploadProgress.value = 100
                    resolve()
                } else {
                    reject(new Error('File upload failed'))
                }
            }

            xhr.onerror = () => {
                isLoading.value = false
                reject(new Error('File upload failed'))
            }

            xhr.send(formData)
        })
    }

    const deleteFile = async (fileId: string) => {
        isLoading.value = true

        try {
            await $fetch('/api/files/delete', {
                method: 'POST',
                body: {
                    fileId
                }
            })
        } finally {
            isLoading.value = false
        }
    }

    const renameFile = async (
        fileId: string,
        name: string
    ) => {
        isLoading.value = true

        try {
            await $fetch('/api/files/rename', {
                method: 'POST',
                body: {
                    fileId,
                    name
                }
            })
        } finally {
            isLoading.value = false
        }
    }

    return {
        isLoading,
        uploadProgress,
        uploadFiles,
        deleteFile,
        renameFile
    }
}