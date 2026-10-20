export async function getDroppedFolderFiles(dataTransfer: DataTransfer): Promise<File[]> {
    const items = Array.from(dataTransfer.items).filter(item => item.kind === 'file')
    const entries = items.map(item => item.webkitGetAsEntry?.())

    // Capture the browser's entries before awaiting: drop data is only available during the event.
    if (!entries.length || entries.some(entry => !entry?.isDirectory)) {
        const files = Array.from(dataTransfer.files)
        if (files.length && files.every(file => file.webkitRelativePath?.includes('/'))) return files
        throw new Error('Drop folders here. Use the Files page to upload individual files.')
    }

    return readFolderEntries(entries as FileSystemEntry[])
}

async function readFolderEntries(entries: FileSystemEntry[]): Promise<File[]> {
    const files: File[] = []
    const visit = async (entry: FileSystemEntry, parent = ''): Promise<void> => {
        const path = parent ? `${parent}/${entry.name}` : entry.name
        if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) =>
                (entry as FileSystemFileEntry).file(resolve, reject))
            Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true })
            files.push(file)
            return
        }
        const reader = (entry as FileSystemDirectoryEntry).createReader()
        while (true) {
            const children = await new Promise<FileSystemEntry[]>((resolve, reject) =>
                reader.readEntries(resolve, reject))
            if (!children.length) break
            for (const child of children) await visit(child, path)
        }
    }

    for (const entry of entries) await visit(entry)
    return files
}

export async function getDroppedUploadItems(dataTransfer: DataTransfer): Promise<{
    files: File[]
    folderFiles: File[]
}> {
    // Snapshot all handles and files synchronously; the browser protects drop data after the event.
    const fallbackFiles = Array.from(dataTransfer.files)
    const items = Array.from(dataTransfer.items).filter(item => item.kind === 'file')
    const snapshots = items.map((item, index) => ({
        entry: item.webkitGetAsEntry?.(),
        file: item.getAsFile?.() ?? fallbackFiles[index]
    }))
    const files: File[] = []
    const folderFiles: File[] = []
    const addFile = (file: File) => {
        if (file.webkitRelativePath?.includes('/')) folderFiles.push(file)
        else files.push(file)
    }

    if (!snapshots.length) {
        fallbackFiles.forEach(addFile)
        return { files, folderFiles }
    }

    for (const { entry, file } of snapshots) {
        if (entry?.isDirectory) {
            folderFiles.push(...await readFolderEntries([entry]))
        } else if (entry?.isFile) {
            const droppedFile = await new Promise<File>((resolve, reject) =>
                (entry as FileSystemFileEntry).file(resolve, reject))
            addFile(droppedFile)
        } else if (file) {
            addFile(file)
        } else {
            throw new Error('Could not read a dropped item. Please try selecting it with Upload.')
        }
    }

    return { files, folderFiles }
}
