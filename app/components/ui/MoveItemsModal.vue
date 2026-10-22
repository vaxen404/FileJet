<template>
    <Teleport to="body">
        <dialog
            ref="dialog"
            class="move-modal"
            @cancel.prevent="close"
            @click.self="close"
        >
            <div class="modal-content">
                <div class="modal-heading">
                    <div>
                        <h2 :id="`${id}-title`">
                            Move {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}
                        </h2>
                        <p>Choose the folder you want to move your selection to.</p>
                    </div>
                    <button
                        type="button"
                        class="close-button"
                        :disabled="isMoving"
                        @click="close"
                    >
                        <Icon name="solar:close-circle-linear" />
                    </button>
                </div>
                <nav class="breadcrumbs">
                    <button
                        type="button"
                        :disabled="isMoving"
                        @click="navigate(null)"
                    >
                        My files
                    </button>
                    <template
                        v-for="folder in breadcrumbs"
                        :key="folder.id"
                    >
                        <Icon name="solar:alt-arrow-right-linear" />
                        <button
                            type="button"
                            :disabled="isMoving"
                            @click="navigate(folder.id)"
                        >
                            {{ folder.name }}
                        </button>
                    </template>
                </nav>
                <label class="search-field">
                    <Icon name="solar:magnifier-linear" />
                    <input
                        ref="searchInput"
                        v-model="search"
                        type="search"
                        placeholder="Search folders here..."
                        :disabled="isMoving"
                    />
                </label>
                <div class="folder-list">
                    <p
                        v-if="loading"
                        class="list-message"
                    >
                        Loading folders...
                    </p>
                    <div
                        v-else-if="loadError"
                        class="list-message"
                    >
                        <p>{{ loadError }}</p>
                        <button
                            type="button"
                            @click="loadFolders"
                        >
                            Try again
                        </button>
                    </div>
                    <template v-else>
                        <button
                            v-for="folder in childFolders"
                            :key="folder.id"
                            type="button"
                            class="folder-row"
                            :disabled="isMoving || excludedFolders.has(folder.id)"
                            :title="
                                excludedFolders.has(folder.id)
                                    ? 'A selected folder and its subfolders cannot be destinations.'
                                    : folder.name
                            "
                            @click="navigate(folder.id)"
                        >
                            <Icon
                                name="solar:folder-bold"
                                class="folder-icon"
                            />
                            <span class="folder-name">{{ folder.name }}</span>
                            <Icon name="solar:alt-arrow-right-linear" />
                        </button>
                        <p
                            v-if="!childFolders.length"
                            class="list-message"
                        >
                            {{
                                search
                                    ? 'No matching folders.'
                                    : 'No subfolders here. You can move your selection to this folder.'
                            }}
                        </p>
                    </template>
                </div>
                <p
                    v-if="saveError"
                    class="form-error"
                >
                    {{ saveError }}
                </p>
                <div class="modal-footer">
                    <span class="destination-label">To: {{ destinationLabel }}</span>
                    <div class="footer-actions">
                        <button
                            type="button"
                            :disabled="isMoving"
                            @click="close"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            class="primary"
                            :disabled="!canMove"
                            @click="move"
                        >
                            <Icon name="solar:folder-path-connect-linear" />
                            {{ isMoving ? 'Moving...' : 'Move here' }}
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import type { DestinationFolder, SelectionItem } from '~~/shared/schemas/selection'

const props = defineProps<{
    open: boolean
    items: SelectionItem[]
    currentFolderId?: string | null
}>()

const emit = defineEmits<{
    close: []
    moved: []
    pending: [value: boolean]
}>()

const { moveItems, isMoving } = useItemActions()
const { openToast } = useToast()

const id = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const folders = ref<DestinationFolder[]>([])
const destinationId = ref<string | null>(null)
const search = ref('')

const loading = ref(false)
const loadError = ref('')
const saveError = ref('')

let loadVersion = 0

const folderMap = computed(() => {
    const foldersById = new Map<string, DestinationFolder>()

    for (const folder of folders.value) {
        foldersById.set(folder.id, folder)
    }

    return foldersById
})

const excludedFolders = computed(() => {
    const selectedFolders = props.items.filter(item => item.type === 'folder')
    const selectedFolderIds = new Set(selectedFolders.map(folder => folder.id))
    const excludedFolderIds = new Set<string>()

    for (const folder of folders.value) {
        let ancestorId: string | null = folder.id
        const visitedFolderIds = new Set<string>()

        while (ancestorId && !visitedFolderIds.has(ancestorId)) {
            if (selectedFolderIds.has(ancestorId)) {
                excludedFolderIds.add(folder.id)

                break
            }

            visitedFolderIds.add(ancestorId)

            const ancestorFolder = folderMap.value.get(ancestorId)
            ancestorId = ancestorFolder?.parent_folder_id ?? null
        }
    }

    return excludedFolderIds
})

const childFolders = computed(() => {
    const searchTerm = search.value.trim().toLowerCase()

    return folders.value.filter(folder => {
        const isInDestination = folder.parent_folder_id === destinationId.value
        const matchesSearch = folder.name.toLowerCase().includes(searchTerm)

        return isInDestination && matchesSearch
    })
})

const destinationLabel = computed(() => {
    if (!destinationId.value) {
        return 'My files'
    }

    const destinationFolder = folderMap.value.get(destinationId.value)

    return destinationFolder?.name ?? 'Folder'
})

const breadcrumbs = computed(() => {
    const path: DestinationFolder[] = []
    const visited = new Set<string>()
    let current = destinationId.value

    while (current && !visited.has(current)) {
        visited.add(current)

        const folder = folderMap.value.get(current)

        if (!folder) {
            break
        }

        path.unshift(folder)
        current = folder.parent_folder_id
    }

    return path
})

const canMove = computed(() => {
    if (props.items.length === 0 || loading.value || loadError.value || isMoving.value) {
        return false
    }

    const isCurrentFolder =
        props.currentFolderId !== undefined && destinationId.value === props.currentFolderId

    if (isCurrentFolder) {
        return false
    }

    if (!destinationId.value) {
        return true
    }

    const destinationExists = folderMap.value.has(destinationId.value)
    const destinationIsExcluded = excludedFolders.value.has(destinationId.value)

    return destinationExists && !destinationIsExcluded
})

const navigate = (folderId: string | null) => {
    if (isMoving.value || (folderId && excludedFolders.value.has(folderId))) {
        return
    }

    destinationId.value = folderId
    search.value = ''
    saveError.value = ''
}

const close = () => {
    if (!isMoving.value) {
        emit('close')
    }
}

const loadFolders = async () => {
    const version = ++loadVersion
    loading.value = true
    loadError.value = ''

    try {
        const result = await $fetch<{ folders: DestinationFolder[] }>('/api/folders/tree')

        if (version === loadVersion) {
            folders.value = result.folders
        }
    } catch (error: any) {
        if (version === loadVersion) {
            loadError.value = error.data?.message || error.message || 'Could not load folders.'
        }
    } finally {
        if (version === loadVersion) {
            loading.value = false
        }
    }
}

watch(isMoving, value => emit('pending', value), { flush: 'sync' })

watch(
    () => props.open,
    async open => {
        if (!open) {
            loadVersion++
            dialog.value?.close()

            return
        }

        destinationId.value = props.currentFolderId ?? null
        search.value = ''
        saveError.value = ''

        await nextTick()

        if (!props.open || !dialog.value?.isConnected) {
            return
        }

        if (!dialog.value.open) {
            dialog.value.showModal()
        }

        searchInput.value?.focus()
        await loadFolders()
    },
    { immediate: true, flush: 'post' }
)

const move = async () => {
    if (!canMove.value) {
        return
    }

    saveError.value = ''

    try {
        const result = await moveItems([...props.items], destinationId.value)

        if (!result) {
            return
        }

        openToast(
            result.movedCount
                ? 'Selection moved successfully.'
                : 'The items are already in this folder.',
            'success'
        )
        emit('moved')
        emit('close')
    } catch (error: any) {
        saveError.value =
            error.data?.message || error.message || 'Could not move the selected items.'
    }
}
</script>

<style scoped>
.move-modal {
    width: min(34rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    overflow-y: auto;
    color: #f3f3f5;
    background: #1a1a1d;
    border: 1px solid #35353c;
    border-radius: 20px;
    box-shadow: 0 24px 80px #0008;
}

.move-modal::backdrop {
    background: #0009;
}

.modal-content {
    padding: 1.25rem;
}

.modal-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

h2 {
    margin: 0;
    font-size: 1.1rem;
}

p {
    color: #a3a3ab;
    font-size: 0.8125rem;
    line-height: 1.5;
}

button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0 0.75rem;
    color: #d5d5da;
    background: #242429;
    border: 1px solid #35353c;
    border-radius: var(--ui-control-radius, 8px);
    font: inherit;
    font-size: var(--ui-control-font-size, 0.875rem);
    cursor: pointer;
}

button:hover:not(:disabled) {
    background: #303036;
}

button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

button:focus-visible {
    outline: 2px solid #8b7cff;
    outline-offset: -2px;
}

.close-button {
    min-height: 2rem;
    width: 2rem;
    padding: 0;
    background: transparent;
    border: 0;
    flex-shrink: 0;
}

.breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    margin: 0.5rem 0 0.75rem;
}

.breadcrumbs button {
    flex-shrink: 0;
    min-height: 2rem;
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 0.5rem;
    border: 0;
    background: transparent;
    color: #b1a5ff;
}

.breadcrumbs > .iconify {
    flex-shrink: 0;
    color: #898991;
}

.search-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    min-height: 2.5rem;
    color: #898991;
    background: #121214;
    border: 1px solid #35353c;
    border-radius: var(--ui-control-radius, 8px);
}

.search-field:focus-within {
    border-color: #8b7cff;
}

.search-field input {
    flex: 1;
    min-width: 0;
    padding: 0.6rem 0;
    color: #f3f3f5;
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 0.875rem;
}

.folder-list {
    min-height: 10rem;
    max-height: 18rem;
    overflow-y: auto;
    margin-top: 0.75rem;
}

.folder-row {
    display: flex;
    width: 100%;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 0;
    background: transparent;
    text-align: left;
}

.folder-row .folder-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.folder-row .folder-icon {
    color: #b1a5ff;
    font-size: 1.25rem;
}

.folder-row .iconify {
    width: 1.125rem;
    height: 1.125rem;
    font-size: 1.125rem;
    flex-shrink: 0;
}

.list-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 9rem;
    padding: 0 1rem;
    text-align: center;
}

.form-error {
    color: #ff8181;
    overflow-wrap: anywhere;
}

.modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    border-top: 1px solid #303036;
    padding-top: 1rem;
    margin-top: 0.75rem;
}

.destination-label {
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #898991;
    font-size: 0.8125rem;
}

.footer-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
}

.primary {
    background: #3c47be;
    border-color: #3c47be;
    color: #fff;
}

.primary:hover:not(:disabled) {
    background: #4a56d4;
}
</style>
