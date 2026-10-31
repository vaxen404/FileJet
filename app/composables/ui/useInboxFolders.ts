import type { InboxFolder } from '~~/shared/types/inbox'

export const useInboxFolders = () => {
    const folders = ref<InboxFolder[]>([])
    const loadingFolders = ref(false), folderError = ref('')
    const folderOptions = computed(() => folders.value.map(folder => ({ id: folder.id, label: folder.name })))
    const loadFolders = async () => {
        loadingFolders.value = true; folderError.value = ''
        try { folders.value = (await $fetch('/api/folders')).folders }
        catch { folderError.value = 'Could not load folders.' }
        finally { loadingFolders.value = false }
    }
    return { folders, folderOptions, loadingFolders, folderError, loadFolders }
}
