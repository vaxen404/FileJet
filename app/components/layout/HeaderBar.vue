<template>
    <header class="header-bar w-full h-16 flex items-center justify-between py-0 px-4 bg-surface border border-divider
        rounded-xl">
        <button
            type="button"
            class="navigation-toggle hidden max-laptop:grid size-11 shrink-0 place-items-center mr-2 rounded-control border border-control-border bg-control text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Open navigation"
            aria-controls="mobile-navigation"
            aria-haspopup="dialog"
            :aria-expanded="navigationOpen"
            @click="$emit('openNavigation')"
        >
            <Icon name="solar:hamburger-menu-linear" size="24" />
        </button>
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
                    <span class="header-separator text-muted">/</span>
                    <span
                        class="header-filename min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-content"
                        :title="fileHeader.fileName"
                        >{{ fileHeader.fileName }}</span
                    >
                </nav>
                <h1 class="m-0 text-foreground text-2xl font-semibold leading-tight" v-else>{{ title }}</h1>
                <template #fallback>
                    <h1 class="m-0 text-foreground text-2xl font-semibold leading-tight">{{ title }}</h1>
                </template>
            </ClientOnly>
        </div>

        <div class="header-actions shrink-0 flex items-center gap-2">
            <button
                class="icon-button [&_svg]:text-[1.3rem] relative flex items-center justify-center text-foreground bg-control
                border border-control-border rounded-md cursor-pointer transition-colors duration-200 ease-[ease]
                hover:bg-raised hover:border-control-border size-10"
                type="button"
                aria-label="Notifications"
            >
                <Icon name="solar:bell-linear" />
                <span class="notification-dot absolute top-[0.55rem] right-[0.55rem] bg-highlight rounded-full size-[0.4rem]"></span>
            </button>

            <div class="header-account hidden max-laptop:block">
                <AccountMenu placement="header" />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import AccountMenu from './AccountMenu.vue'

defineProps({
    navigationOpen: { type: Boolean, default: false },
    title: {
        type: String,
        default: 'Dashboard'
    }
})

defineEmits<{ openNavigation: [] }>()

const fileHeader = useFileHeader()
const route = useRoute()

const isFileDetails = computed(
    () =>
        /^\/(files|notes|folders)\/[^/]+\/?$/.test(route.path) &&
        fileHeader.value?.fileId ===
            (route.params.id ?? route.params.noteId ?? route.params.folderId)
)
</script>
