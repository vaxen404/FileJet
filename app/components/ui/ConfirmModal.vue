<template>
    <Teleport to="body">
        <div
            v-if="show"
            class="modal-overlay"
            @click.self="emit('cancel')"
        >
            <div class="confirm-modal">
                <div class="modal-icon">
                    <Icon name="solar:danger-triangle-bold" />
                </div>

                <h3>{{ title }}</h3>

                <p>{{ message }}</p>

                <div class="modal-actions">
                    <button
                        type="button"
                        class="cancel-button"
                        @click="emit('cancel')"
                    >
                        {{ cancelText || 'Cancel' }}
                    </button>

                    <button
                        type="button"
                        class="confirm-button"
                        @click="emit('confirm')"
                    >
                        {{ confirmText || 'Confirm' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
defineProps<{
    show: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
}>()

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(0, 0, 0, 0.65);

    backdrop-filter: blur(4px);

    z-index: 9999;
}

.confirm-modal {
    width: 24rem;

    padding: 1.5rem;

    display: flex;
    flex-direction: column;
    align-items: center;

    background: #1a1a1d;

    border: 1px solid #29292e;
    border-radius: 12px;

    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.45);

    box-sizing: border-box;
}

.modal-icon {
    width: 3.2rem;
    height: 3.2rem;

    display: flex;
    align-items: center;
    justify-content: center;

    margin-bottom: 1rem;

    background: #3a2024;
    color: #ff6b6b;

    border-radius: 6px;

    font-size: 1.5rem;
}

.confirm-modal h3 {
    margin: 0 0 0.5rem;

    color: #ffffff;

    font-size: 1.1rem;
    font-weight: 600;
}

.confirm-modal p {
    margin: 0;

    color: #a8a8b0;

    font-size: 0.9rem;
    text-align: center;
    line-height: 1.5;
}

.modal-actions {
    width: 100%;

    display: flex;

    gap: 0.75rem;

    margin-top: 1.5rem;
}

.cancel-button,
.confirm-button {
    flex: 1;

    height: 2.5rem;

    border-radius: 6px;

    font-size: 0.875rem;
    font-weight: 500;

    cursor: pointer;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
    box-sizing: border-box;
}

.cancel-button {
    background: #242429;
    color: #ffffff;

    border: 1px solid #303036;
}

.cancel-button:hover {
    background: #2d2d33;
}

.confirm-button {
    background: #b91c1c;
    color: #ffffff;

    border: none;
}

.confirm-button:hover {
    background: #dc2626;
}
</style>
