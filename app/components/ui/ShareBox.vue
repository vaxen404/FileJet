<script setup lang="ts">
const props = defineProps<{
    itemId: string
    itemType: 'file' | 'folder' | 'note'
}>()

const { openToast } = useToast()

const shareLink = ref<string | null>(null)
const copied = ref(false)
const isLoading = ref(false)

let requestId = 0

const loadShareLink = async () => {
    const currentRequest = ++requestId
    const currentItemId = props.itemId
    const currentItemType = props.itemType

    shareLink.value = null
    copied.value = false

    try {
        const response = await $fetch<{
            url: string | null
        }>('/api/shared', {
            query: {
                itemId: props.itemId,
                itemType: props.itemType
            }
        })

        if (currentRequest !== requestId) return

        if (
            props.itemId !== currentItemId ||
            props.itemType !== currentItemType
        ) {
            return
        }

        shareLink.value = response.url
    } catch (err: any) {
        if (currentRequest !== requestId) return

        openToast(
            err.data?.message || err.message || 'Could not load share link.',
            'error'
        )
    }
}

const createShareLink = async () => {
    if (isLoading.value) return

    const currentRequest = ++requestId
    const currentItemId = props.itemId
    const currentItemType = props.itemType

    try {
        isLoading.value = true

        const response = await $fetch<{
            url: string
        }>('/api/shared/create', {
            method: 'POST',
            body: {
                itemId: props.itemId,
                itemType: props.itemType
            }
        })

        if (currentRequest !== requestId) return

        if (
            props.itemId !== currentItemId ||
            props.itemType !== currentItemType
        ) {
            return
        }

        shareLink.value = response.url
        copied.value = false

        openToast(
            'Share link created successfully.',
            'success'
        )
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'Could not create share link.',
            'error'
        )
    } finally {
        if (currentRequest === requestId) {
            isLoading.value = false
        }
    }
}

const removeShareLink = async () => {
    if (isLoading.value) return

    const currentRequest = ++requestId
    const currentItemId = props.itemId
    const currentItemType = props.itemType

    try {
        isLoading.value = true
        await $fetch('/api/shared/remove', {
            method: 'POST',
            body: {
                itemId: props.itemId,
                itemType: props.itemType
            }
        })

        if (currentRequest !== requestId) return

        if (
            props.itemId !== currentItemId ||
            props.itemType !== currentItemType
        ) {
            return
        }

        shareLink.value = null
        copied.value = false

        openToast(
            'Share link removed successfully.',
            'success'
        )
    } catch (err: any) {
        if (currentRequest !== requestId) return

        openToast(
            err.data?.message || err.message || 'Could not remove share link.',
            'error'
        )
    } finally {
        if (currentRequest === requestId) {
            isLoading.value = false
        }
    }
}

const copyShareLink = async () => {
    if (!shareLink.value) return

    try {
        await navigator.clipboard.writeText(
            shareLink.value
        )

        copied.value = true

        openToast(
            'Share link copied.',
            'success'
        )

        setTimeout(() => {
            copied.value = false
        }, 1500)
    } catch (err: any) {
        openToast(
            err.data?.message || err.message || 'Could not copy share link.',
            'error'
        )
    }
}

watch(
    () => [
        props.itemId,
        props.itemType
    ],
    () => {
        requestId++
        isLoading.value = false
        loadShareLink()
    },
    {
        immediate: true
    }
)
</script>

<template>
    <div class="share-box-card">
        <div class="share-title">
            <Icon name="solar:link-bold" />
            Share
        </div>

        <template v-if="!shareLink">
            <p class="share-description">
                Create a share link to let others view this item.
            </p>

            <button
                class="create-share-btn"
                :disabled="isLoading"
                @click="createShareLink"
            >
                <Icon name="solar:link-circle-bold" />
                Create Link
            </button>
        </template>

        <template v-else>
            <div class="share-link">
                <input
                    type="text"
                    :value="shareLink"
                    readonly
                >

               <button
                    class="copy-btn"
                    @click="copyShareLink"
                >
                    <Icon
                        :name="copied
                            ? 'solar:check-circle-bold'
                            : 'solar:copy-bold'"
                    />
                </button>
            </div>

            <span class="share-description">
                Anyone with the link can view this item.
            </span>

            <button
                class="remove-share-btn"
                :disabled="isLoading"
                @click="removeShareLink"
            >
                <Icon name="solar:trash-bin-trash-linear" />
                Remove Link
            </button>
        </template>

    </div>
</template>

<style scoped>
.share-box-card {
    width: 100%;

    padding: 1rem;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 0.75rem;

    box-sizing: border-box;
}

.share-title {
    display: flex;
    align-items: center;

    gap: 0.5rem;

    margin-bottom: 0.8rem;

    color: #ffffff;

    font-size: 0.9rem;
    font-weight: 600;
}

.share-description {
    display: block;

    margin: 0 0 0.8rem;

    color: #898991;

    font-size: 0.75rem;
}

.create-share-btn,
.remove-share-btn {
    height: 2.5rem;

    padding: 0 0.9rem;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 0.45rem;

    border-radius: 0.5rem;

    font-family: Inter, sans-serif;
    font-size: 0.8rem;
    font-weight: 500;

    cursor: pointer;
}

.create-share-btn {
    background: #3c47be;
    color: #ffffff;

    border: 1px solid #3c47be;
}

.create-share-btn:hover {
    background: #4652d1;
}

.share-link {
    display: flex;

    gap: 0.5rem;

    margin-bottom: 0.65rem;
}

.share-link input {
    flex: 1;

    min-width: 0;
    height: 2.6rem;

    padding: 0 0.8rem;

    background: #151518;
    color: #d5d5da;

    border: 1px solid #303036;
    border-radius: 0.5rem;

    outline: none;

    font-family: Inter, sans-serif;
    font-size: 0.8rem;
}

.copy-btn {
    width: 2.6rem;
    height: 2.6rem;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    background: #242429;
    color: #d5d5da;

    border: 1px solid #303036;
    border-radius: 0.5rem;

    cursor: pointer;
}

.copy-btn:hover {
    background: #2a2a2f;
    color: #ffffff;
}

.remove-share-btn {
    margin-top: 0.8rem;

    background: transparent;
    color: #ff6b6b;

    border: 1px solid #4a292d;
}

.remove-share-btn:hover {
    background: #3a2024;
}
</style>
