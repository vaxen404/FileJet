<script setup lang="ts">
import Toast from '~/components/ui/Toast.vue'

const { toasts, runToastAction, resumeToasts, closeToast } = useToast()
const { confirmation, resolveConfirm } = useConfirm()

onMounted(resumeToasts)
</script>

<template>
    <NuxtLayout>
        <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>

    <ConfirmModal
        :show="Boolean(confirmation)"
        :title="confirmation?.title ?? ''"
        :message="confirmation?.message ?? ''"
        :confirm-text="confirmation?.confirmText"
        :cancel-text="confirmation?.cancelText"
        :variant="confirmation?.variant ?? 'neutral'"
        @confirm="resolveConfirm(true)"
        @cancel="resolveConfirm(false)"
    />

    <TransitionGroup name="toast" tag="div" class="toast-stack fixed right-[calc(1rem_+_env(safe-area-inset-right,_0px))]
        bottom-[calc(1rem_+_env(safe-area-inset-bottom,_0px))] z-9999 flex flex-col items-end gap-2
        max-w-[calc(100vw_-_2rem)] max-h-[calc(100dvh_-_2rem)] overflow-y-auto pointer-events-none">
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
    </TransitionGroup>
</template>
