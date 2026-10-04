<script setup lang="ts">
defineProps<{
    message: string,
    show: boolean,
    type?: 'success' | 'error'
}>()
</script>

<template>
    <Transition name="toast">
        <div
            v-if="show"
            class="toast"
            :class="type"
        >
            <Icon
                :name="type === 'error'
                ? 'lucide:circle-x'
                : 'lucide:circle-check'"
            />

            <span>{{ message }}</span>
        </div>
    </Transition>
</template>

<style scoped>
    .toast {
        position: fixed;
        top: 1.5rem;
        left: 50%;
        transform: translateX(-50%);

        display: flex;
        align-items: center;
        gap: 0.7rem;

        min-width: 20rem;
        padding: 1rem 1.3rem;
        
        background: #212124;
        border: 1px solid #2f2f33;
        border-radius: 0.8rem;

        color: #f5f5f5;
        font-family: Arial, Arial, Helvetica, sans-serif;
        font-size: 0.95rem;

        z-index: 9999;
    }

    .toast svg {
        width: 1.2rem;
        height: 1.2rem;
    }

    .toast.success svg {
        color: #5a67ff;
    }

    .toast.error svg {
        color: #ff4d4d;
    }

    .toast-enter-active,
    .toast-leave-active {
        transition: 0.2s ease;
    }

    .toast-enter-from,
    .toast-leave-to {
        opacity: 0;
        transform: translate(-50%, -0.5rem);
    }
</style>