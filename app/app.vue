<script setup lang="ts">
import Toast from '~/components/ui/Toast.vue'

const { toasts, runToastAction, resumeToasts, closeToast } = useToast()

onMounted(resumeToasts)
</script>

<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>

    <div class="toast-stack">
        <Toast
            v-for="toast in toasts"
            :key="`${toast.id}:${toast.actionVariant ?? 'default'}`"
            :show="true"
            :message="toast.message"
            :type="toast.type"
            :action-label="toast.actionLabel"
            :action-variant="toast.actionVariant"
            :pending="toast.pending"
            @action="runToastAction(toast.id)"
            @close="closeToast(toast.id)"
        />
    </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.toast-stack {
    position: fixed;
    right: calc(1rem + env(safe-area-inset-right, 0px));
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    max-width: calc(100vw - 2rem);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    pointer-events: none;
}

:where(button, input[type='button'], input[type='submit'], input[type='reset']) {
    border-radius: 6px;
}

:where(
    input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']),
    textarea,
    select
) {
    border-radius: 6px;
}

:where(input[type='checkbox']) {
    border-radius: 4px;
}

:where(dialog, [role='dialog'], [role='alertdialog']) {
    border-radius: 12px;
}

:where([role='tooltip']) {
    border-radius: 6px;
}

* {
    font-family: 'Inter', sans-serif;
}

body {
    margin: 0;
}
</style>
