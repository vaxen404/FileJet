<template>
    <Teleport to="body">
        <dialog
            ref="dialog"
            class="move-modal w-[min(34rem,_calc(100vw_-_2rem))] max-h-[calc(100dvh_-_2rem)] p-0 overflow-y-auto
                text-foreground bg-surface border border-control-border rounded-[20px] shadow-[0_24px_80px_#0008]
                backdrop:bg-[#0009]"
            @cancel.prevent="close"
            @click.self="close"
        >
            <div class="modal-content p-5">
                <div class="modal-heading flex items-start justify-between gap-4">
                    <div>
                        <h2 class="m-0 text-[1.1rem]" :id="`${id}-title`">
                            Move {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}
                        </h2>
                        <p class="text-heading-muted text-[0.8125rem] leading-normal">Choose the folder you want to move your selection to.</p>
                    </div>
                    <button
                        type="button"
                        class="close-button inline-flex items-center justify-center gap-2 min-h-8 p-0 text-content bg-transparent
                            border-0 rounded-lg text-sm cursor-pointer w-8 shrink-0 hover:enabled:bg-control-border
                            disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                            focus-visible:-outline-offset-2"
                        :disabled="isMoving"
                        @click="close"
                    >
                        <Icon name="solar:close-circle-linear" />
                    </button>
                </div>
                <nav class="breadcrumbs flex items-center gap-1 overflow-x-auto mt-2 mr-0 mb-3 ml-0">
                    <button class="move-breadcrumb"
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
                        <Icon class="shrink-0 text-muted" name="solar:alt-arrow-right-linear" />
                        <button class="move-breadcrumb"
                            type="button"
                            :disabled="isMoving"
                            @click="navigate(folder.id)"
                        >
                            {{ folder.name }}
                        </button>
                    </template>
                </nav>
                <label class="search-field flex items-center gap-2 py-0 px-3 min-h-10 text-muted bg-canvas border
                    border-control-border rounded-lg focus-within:border-accent">
                    <Icon name="solar:magnifier-linear" />
                    <input class="flex-1 min-w-0 py-[0.6rem] px-0 text-foreground bg-transparent border-0 outline-none text-sm
                        leading-[inherit]"
                        ref="searchInput"
                        v-model="search"
                        type="search"
                        placeholder="Search folders here..."
                        :disabled="isMoving"
                    />
                </label>
                <div class="folder-list min-h-40 max-h-72 overflow-y-auto mt-3">
                    <p
                        v-if="loading"
                        class="list-message text-heading-muted text-[0.8125rem] leading-normal flex flex-col items-center
                            justify-center min-h-36 py-0 px-4 text-center"
                    >
                        Loading folders...
                    </p>
                    <div
                        v-else-if="loadError"
                        class="list-message flex flex-col items-center justify-center min-h-36 py-0 px-4 text-center"
                    >
                        <p class="text-heading-muted text-[0.8125rem] leading-normal">{{ loadError }}</p>
                        <button class="move-button"
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
                            class="folder-row flex items-center justify-center gap-3 min-h-10 p-3 text-content bg-transparent border-0
                                rounded-lg text-sm cursor-pointer w-full text-left hover:enabled:bg-control-border
                                disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                                focus-visible:-outline-offset-2"
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
                                class="folder-icon text-accent text-lg leading-[inherit] shrink-0 size-4.5"
                            />
                            <span class="folder-name flex-1 min-w-0 truncate">{{ folder.name }}</span>
                            <Icon class="text-lg leading-[inherit] shrink-0 size-4.5" name="solar:alt-arrow-right-linear" />
                        </button>
                        <p
                            v-if="!childFolders.length"
                            class="list-message text-heading-muted text-[0.8125rem] leading-normal flex flex-col items-center
                                justify-center min-h-36 py-0 px-4 text-center"
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
                    class="form-error text-danger text-[0.8125rem] leading-normal wrap-anywhere"
                >
                    {{ saveError }}
                </p>
                <div class="modal-footer flex items-center justify-between flex-wrap gap-3 border-t border-t-control-border pt-4
                    mt-3">
                    <span class="destination-label max-w-56 text-muted text-[0.8125rem] truncate">To: {{ destinationLabel }}</span>
                    <div class="footer-actions flex gap-2 ml-auto">
                        <button class="move-button"
                            type="button"
                            :disabled="isMoving"
                            @click="close"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            class="primary inline-flex items-center justify-center gap-2 min-h-10 py-0 px-3 text-on-primary bg-primary
                                border rounded-lg text-sm cursor-pointer border-primary hover:enabled:bg-primary/85
                                disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent
                                focus-visible:-outline-offset-2"
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
            'success', { notification: result.movedCount ? { title: 'Items moved', category: 'library', href: '/folders' } : false }
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
@reference "~/assets/css/tailwind.css";

@layer components {
    .move-breadcrumb {
        @apply inline-flex items-center justify-center gap-2 min-h-8 py-0 px-2;
        @apply text-accent bg-transparent border-0 rounded-lg text-sm cursor-pointer shrink-0;
        @apply max-w-56 hover:enabled:bg-control-border disabled:opacity-40 disabled:cursor-not-allowed;
        @apply focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2;
        @apply truncate;
    }

    .move-button {
        @apply inline-flex items-center justify-center gap-2 min-h-10 py-0 px-3;
        @apply text-content bg-raised border border-control-border rounded-lg text-sm cursor-pointer;
        @apply hover:enabled:bg-control-border disabled:opacity-40 disabled:cursor-not-allowed;
        @apply focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2;
    }
}
</style>
