<template>
    <Teleport to="body">
        <div
            v-if="show"
            class="modal-overlay fixed inset-0 flex items-center justify-center bg-black/65 backdrop-blur-xs z-9999"
            @click.self="emit('cancel')"
        >
            <div class="confirm-modal w-96 p-6 flex flex-col items-center bg-surface border border-divider rounded-xl
                shadow-[0_1rem_3rem_rgba(0,_0,_0,_0.45)]">
                <div class="modal-icon flex items-center justify-center mb-4 bg-[#3a2024] text-[#ff6b6b] rounded-md text-2xl
                    leading-[inherit] size-[3.2rem]">
                    <Icon name="solar:danger-triangle-bold" />
                </div>

                <h3 class="mt-0 mr-0 mb-2 ml-0 text-white text-[1.1rem] font-semibold">{{ title }}</h3>

                <p class="m-0 text-label text-[0.9rem] text-center leading-normal">{{ message }}</p>

                <div class="modal-actions w-full flex gap-3 mt-6">
                    <button
                        type="button"
                        class="cancel-button flex-1 h-10 rounded-md text-sm font-medium cursor-pointer leading-normal bg-raised
                        text-white border border-control-border hover:bg-[#2d2d33]"
                        @click="emit('cancel')"
                    >
                        {{ cancelText || 'Cancel' }}
                    </button>

                    <button
                        type="button"
                        class="confirm-button flex-1 h-10 rounded-md text-sm font-medium cursor-pointer leading-normal bg-[#b91c1c]
                        text-white border-0 hover:bg-[#dc2626]"
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
