<template>
    <Transition name="toast">
        <div
            v-if="show"
            class="toast"
            :class="[type, { 'toast--trash-inline': actionVariant === 'trash-undo' }]"
            :role="type === 'error' ? 'alert' : 'status'"
            aria-atomic="true"
        >
            <template v-if="actionVariant === 'trash-undo'">
                <span class="trash-toast-message">{{ message }}</span>

                <div class="trash-toast-controls">
                    <button
                        v-if="actionLabel"
                        type="button"
                        class="trash-toast-undo"
                        :disabled="pending"
                        :aria-busy="pending"
                        @click="$emit('action')"
                    >
                        {{ pending ? 'Restoring...' : actionLabel }}
                    </button>

                    <button
                        type="button"
                        class="trash-toast-close"
                        aria-label="Dismiss notification"
                        @click="$emit('close')"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M3 3L13 13M13 3L3 13"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>
            </template>

            <template v-else>
                <Icon
                    class="toast-icon"
                    :name="type === 'error' ? 'solar:close-circle-linear' : 'solar:check-circle-linear'"
                    size="1rem"
                    aria-hidden="true"
                />

                <span class="toast-message">{{ message }}</span>

                <button
                    v-if="actionLabel"
                    type="button"
                    class="toast-action"
                    :disabled="pending"
                    :aria-busy="pending"
                    @click="$emit('action')"
                >
                    {{ pending ? 'Restoring...' : actionLabel }}
                </button>
            </template>
        </div>
    </Transition>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        message: string
        show: boolean
        type?: 'success' | 'error'
        actionLabel?: string | null
        actionVariant?: 'trash-undo' | null
        pending?: boolean
    }>(),
    { type: 'success', actionLabel: null, actionVariant: null, pending: false }
)

defineEmits<{ action: []; close: [] }>()
</script>

<style scoped>
.toast {
    position: relative;
    pointer-events: auto;
    flex: 0 0 auto;

    display: flex;
    align-items: center;
    gap: 0.6rem;

    width: max-content;
    max-width: min(28rem, calc(100vw - 2rem));
    padding: 0.75rem 1rem;
    box-sizing: border-box;

    background: #17263a;
    border: 1px solid #294568;
    border-radius: 24px;
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

.toast-action {
    flex: 0 0 auto;
    margin-left: 0.75rem;
    padding: 0.25rem 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}

.toast-action:hover:not(:disabled) {
    text-decoration: underline;
}

.toast-action:disabled {
    opacity: 0.65;
    cursor: wait;
}

.toast--trash-inline {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 1rem;
    width: 25rem;
    max-width: calc(100vw - 2rem);
    min-height: 4rem;
    padding: 0.875rem 1rem;
    background: #16161c;
    border: 1px solid #34343f;
    border-radius: 0.5rem;
    box-shadow: none;
    color: #ededf0;
}

.trash-toast-message {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    color: #ededf0;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.trash-toast-controls {
    flex: 0 0 auto;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.875rem;
}

.trash-toast-undo {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.75rem;
    padding: 4px 14px;
    border: 1px solid #414149;
    border-radius: 999px;
    background: transparent;
    color: #ededf0;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.25;
    white-space: nowrap;
    cursor: pointer;
}

.trash-toast-undo:hover:not(:disabled) {
    background: #ffffff08;
}

.trash-toast-undo:disabled {
    opacity: 0.65;
    cursor: wait;
}

.trash-toast-close {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #9393a3;
    cursor: pointer;
}

.trash-toast-close:hover {
    color: #ededf0;
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
