import type { InboxFolder } from '~~/shared/types/inbox'

export const useInboxFolders = () => {
    const folders = ref<InboxFolder[]>([])
    const loadingFolders = ref(false), folderError = ref('')
    const folderOptions = computed(() => {
        const byId = new Map(folders.value.map(folder => [folder.id, folder]))
        return folders.value.map(folder => {
            const path: string[] = [], seen = new Set<string>()
            let current: InboxFolder | undefined = folder
            while (current && !seen.has(current.id)) {
                seen.add(current.id); path.unshift(current.name)
                current = current.parent_folder_id ? byId.get(current.parent_folder_id) : undefined
            }
            return { id: folder.id, label: path.join(' / ') }
        })
    })
    const loadFolders = async () => {
        loadingFolders.value = true; folderError.value = ''
        try { folders.value = (await $fetch('/api/folders/tree')).folders }
        catch { folderError.value = 'Could not load folders.' }
        finally { loadingFolders.value = false }
    }
    return { folders, folderOptions, loadingFolders, folderError, loadFolders }
}
