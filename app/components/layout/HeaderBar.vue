<template>
    <header class="header-bar">
        <div class="title">
            <ClientOnly>
                <nav
                    v-if="fileHeader && isFileDetails"
                    class="header-breadcrumb"
                >
                    <NuxtLink
                        :to="fileHeader.returnPath"
                        class="header-back"
                    >
                        <Icon
                            name="solar:arrow-left-linear"
                            size="1.2rem"
                        />
                        <span>Back to {{ fileHeader.returnName }}</span>
                    </NuxtLink>
                    <span class="header-separator">/</span>
                    <span
                        class="header-filename"
                        :title="fileHeader.fileName"
                        >{{ fileHeader.fileName }}</span
                    >
                </nav>
                <h1 v-else>{{ title }}</h1>
                <template #fallback>
                    <h1>{{ title }}</h1>
                </template>
            </ClientOnly>
        </div>

        <div class="header-actions">
            <button
                class="icon-button"
                type="button"
            >
                <Icon name="solar:bell-linear" />
                <span class="notification-dot"></span>
            </button>

            <button
                class="profile-button"
                type="button"
            >
                <div class="avatar">
                    {{ avatar }}
                </div>

                <Icon
                    class="arrow-icon"
                    name="solar:alt-arrow-down-linear"
                />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
defineProps({
    title: {
        type: String,
        default: 'Dashboard'
    }
})

const avatar = ref('VX')
const fileHeader = useFileHeader()
const route = useRoute()

const isFileDetails = computed(
    () =>
        /^\/(files|notes|folders)\/[^/]+\/?$/.test(route.path) &&
        fileHeader.value?.fileId ===
            (route.params.id ?? route.params.noteId ?? route.params.folderId)
)
</script>

<style scoped>
.title {
    flex: 1;
    min-width: 0;
    margin-right: 1rem;
}

.header-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    font-size: 0.875rem;
    line-height: 1.5;
}

.header-back {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    color: #8b7cff;
    text-decoration: none;
    font-weight: 500;
}

.header-back:hover {
    color: #b5acff;
}

.header-separator {
    color: #6f6f78;
}

.header-filename {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #c5c5cb;
}

.header-actions {
    flex-shrink: 0;
}

.header-bar {
    width: 100%;
    height: 4rem;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 1rem;

    background: #1a1a1d;
    border: 1px solid #29292e;
    border-radius: 12px;

    box-sizing: border-box;
}

.title h1 {
    margin: 0;

    color: #ffffff;

    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.icon-button {
    position: relative;

    width: 2.5rem;
    height: 2.5rem;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #ffffff;
    background: #202024;

    border: 1px solid #303036;
    border-radius: 6px;

    cursor: pointer;

    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}

.icon-button:hover {
    background: #2a2a2f;
    border-color: #3d3d44;
}

.icon-button svg {
    font-size: 1.3rem;
}

.notification-dot {
    position: absolute;

    top: 0.55rem;
    right: 0.55rem;

    width: 0.4rem;
    height: 0.4rem;

    background: #5a5aff;
    border-radius: 50%;
}

.profile-button {
    height: 2.5rem;

    display: flex;
    align-items: center;
    gap: 0.5rem;

    padding: 0 0.5rem;

    color: #ffffff;
    background: #202024;

    border: 1px solid #303036;
    border-radius: 6px;

    cursor: pointer;

    transition:
        background 0.2s ease,
        border-color 0.2s ease;
}

.profile-button:hover {
    background: #2a2a2f;
    border-color: #3d3d44;
}

.avatar {
    width: 2rem;
    height: 2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #3c47be;
    border-radius: 50%;

    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.25;
}

.arrow-icon {
    color: #b5b5bd;
    font-size: 1rem;
}
</style>
