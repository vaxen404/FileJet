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

<template>
    <Transition name="toast">
        <div
            v-if="show"
            class="toast"
            :class="type"
            :role="type === 'error' ? 'alert' : 'status'"
            aria-atomic="true"
        >
            <div class="toast-icon" aria-hidden="true">
                <Icon
                    :name="type === 'error' ? 'solar:close-circle-bold' : 'solar:check-circle-bold'"
                    size="1.35rem"
                />
            </div>

            <div class="toast-content">
                <strong class="toast-title">{{ type === 'error' ? 'Something went wrong' : 'Success' }}</strong>
                <span class="toast-message">{{ message }}</span>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
    .toast {
        --toast-accent: #69a9ff;
        --toast-tint: #17243a;
        --toast-border: #2d4261;
        --toast-icon-background: #1d3150;
        --toast-message: #aebed6;

        position: fixed;
        top: calc(1.25rem + env(safe-area-inset-top, 0px));
        left: 50%;
        transform: translateX(-50%);

        display: flex;
        align-items: flex-start;
        gap: 0.85rem;

        width: min(28rem, calc(100vw - 2rem));
        padding: 1rem 1.2rem;
        box-sizing: border-box;
        
        background: linear-gradient(110deg, var(--toast-tint), #1a1a1d 70%);
        border: 1px solid var(--toast-border);
        border-radius: 0.85rem;
        box-shadow: 0 0.75rem 2rem #00000040;

        color: #f5f5f5;
        font-family: inherit;

        z-index: 9999;
    }

    .toast::before {
        content: '';
        position: absolute;
        top: 1rem;
        bottom: 1rem;
        left: 0;
        width: 3px;
        background: var(--toast-accent);
        border-radius: 0 3px 3px 0;
    }

    .toast.error {
        --toast-accent: #ff7d89;
        --toast-tint: #321f28;
        --toast-border: #56303b;
        --toast-icon-background: #422630;
        --toast-message: #cbb4bb;
    }

    .toast-icon {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.6rem;
        height: 2.6rem;
        box-sizing: border-box;
        color: var(--toast-accent);
        background: var(--toast-icon-background);
        border: 1px solid var(--toast-border);
        border-radius: 0.7rem;
    }

    .toast-content {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .toast-title {
        color: #f5f5f5;
        font-size: 0.85rem;
        font-weight: 600;
        line-height: 1.4;
    }

    .toast-message {
        color: var(--toast-message);
        font-size: 0.8rem;
        line-height: 1.6;
        white-space: pre-line;
        overflow-wrap: anywhere;
    }

    .toast-enter-active,
    .toast-leave-active {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .toast-enter-from,
    .toast-leave-to {
        opacity: 0;
        transform: translate(-50%, -0.5rem);
    }

    @media (prefers-reduced-motion: reduce) {
        .toast-enter-active,
        .toast-leave-active {
            transition: none;
        }
    }
</style>
