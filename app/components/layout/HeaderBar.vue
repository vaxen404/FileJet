<template>
    <header class="header-bar w-full h-16 flex items-center justify-between py-0 px-4 bg-surface border border-divider
        rounded-xl">
        <div class="title flex-1 min-w-0 mr-4">
            <ClientOnly>
                <nav
                    v-if="fileHeader && isFileDetails"
                    class="header-breadcrumb flex items-center gap-3 min-w-0 text-sm leading-normal"
                >
                    <NuxtLink
                        :to="fileHeader.returnPath"
                        class="header-back inline-flex items-center gap-2 shrink-0 text-accent no-underline font-medium
                        hover:text-accent"
                    >
                        <Icon
                            name="solar:arrow-left-linear"
                            size="1.2rem"
                        />
                        <span>Back to {{ fileHeader.returnName }}</span>
                    </NuxtLink>
                    <span class="header-separator text-[#6f6f78]">/</span>
                    <span
                        class="header-filename min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[#c5c5cb]"
                        :title="fileHeader.fileName"
                        >{{ fileHeader.fileName }}</span
                    >
                </nav>
                <h1 class="m-0 text-white text-2xl font-semibold leading-tight" v-else>{{ title }}</h1>
                <template #fallback>
                    <h1 class="m-0 text-white text-2xl font-semibold leading-tight">{{ title }}</h1>
                </template>
            </ClientOnly>
        </div>

        <div class="header-actions shrink-0 flex items-center gap-2">
            <button
                class="icon-button [&_svg]:text-[1.3rem] relative flex items-center justify-center text-white bg-control
                border border-control-border rounded-md cursor-pointer transition-colors duration-200 ease-[ease]
                hover:bg-[#2a2a2f] hover:border-[#3d3d44] size-10"
                type="button"
            >
                <Icon name="solar:bell-linear" />
                <span class="notification-dot absolute top-[0.55rem] right-[0.55rem] bg-highlight rounded-full size-[0.4rem]"></span>
            </button>

            <button
                class="profile-button h-10 flex items-center gap-2 py-0 px-2 text-white bg-control border
                border-control-border rounded-md cursor-pointer transition-colors duration-200 ease-[ease]
                hover:bg-[#2a2a2f] hover:border-[#3d3d44]"
                type="button"
            >
                <div class="avatar flex items-center justify-center bg-primary rounded-full text-xs font-semibold leading-tight
                    size-8">
                    {{ avatar }}
                </div>

                <Icon
                    class="arrow-icon text-secondary text-base leading-[inherit]"
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

const currentUser = useAuthUser()
const avatar = computed(() => currentUser.value?.username.slice(0, 2).toUpperCase() || 'FJ')
const fileHeader = useFileHeader()
const route = useRoute()

const isFileDetails = computed(
    () =>
        /^\/(files|notes|folders)\/[^/]+\/?$/.test(route.path) &&
        fileHeader.value?.fileId ===
            (route.params.id ?? route.params.noteId ?? route.params.folderId)
)
</script>
