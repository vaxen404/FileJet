<template>
    <Transition name="toast">
        <div
            v-if="show"
            class="toast"
            :class="type"
            :role="type === 'error' ? 'alert' : 'status'"
            aria-atomic="true"
        >
            <Icon
                class="toast-icon"
                :name="type === 'error' ? 'solar:close-circle-linear' : 'solar:check-circle-linear'"
                size="1rem"
                aria-hidden="true"
            />

            <span class="toast-message">{{ message }}</span>
        </div>
    </Transition>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        message: string
        show: boolean
        type?: 'success' | 'error'
    }>(),
    { type: 'success' }
)
</script>

<style scoped>
    .toast {
        position: fixed;
        top: calc(1rem + env(safe-area-inset-top, 0px));
        left: 50%;
        transform: translateX(-50%);

        display: flex;
        align-items: center;
        gap: 0.6rem;

        width: max-content;
        max-width: min(28rem, calc(100vw - 2rem));
        padding: 0.75rem 1rem;
        box-sizing: border-box;
        
        background: #17263a;
        border: 1px solid #294568;
        border-radius: 0.5rem;
        box-shadow: 0 0.25rem 1rem #00000026;

        color: #c5dcff;
        font-family: inherit;

        z-index: 9999;
    }

    .toast-icon {
        flex: 0 0 auto;
        color: #7bb5ff;
    }

    .toast.error {
        background: #301d22;
        border-color: #593039;
        color: #ffc5cd;
    }

    .toast.error .toast-icon {
        color: #ff8998;
    }

    .toast-message {
        min-width: 0;
        font-size: 0.8rem;
        line-height: 1.5;
        white-space: pre-line;
        overflow-wrap: anywhere;
    }

    .toast-enter-active,
    .toast-leave-active {
        transition: opacity 0.15s ease;
    }

    .toast-enter-from,
    .toast-leave-to {
        opacity: 0;
    }

    @media (prefers-reduced-motion: reduce) {
        .toast-enter-active,
        .toast-leave-active {
            transition: none;
        }
    }
</style>
