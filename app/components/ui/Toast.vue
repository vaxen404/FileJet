<template>
    <Transition
        name="toast"
        enter-active-class="transition-opacity duration-150 ease-[ease] motion-reduce:transition-none"
        leave-active-class="transition-opacity duration-150 ease-[ease] motion-reduce:transition-none"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
    >
        <div
            v-if="show"
            class="toast group/toast relative pointer-events-auto flex-none flex items-center border
            [font-family:inherit] z-9999 is-error:bg-[#301d22] is-error:border-[#593039] is-error:text-[#ffc5cd]"
            :class="[
                type,
                { 'toast--trash-inline': actionVariant === 'trash-undo' },
                actionVariant === 'trash-undo'
                    ? 'flex-nowrap gap-4 w-100 max-w-[calc(100vw_-_2rem)] min-h-16 px-4 py-3.5 bg-[#16161c] border-[#34343f] rounded-lg shadow-none text-[#ededf0]'
                    : 'gap-[0.6rem] w-max max-w-[min(28rem,_calc(100vw_-_2rem))] px-4 py-3 bg-[#17263a] border-[#294568] rounded-3xl shadow-[0_0.25rem_1rem_#00000026] text-[#c5dcff]'
            ]"
        >
            <template v-if="actionVariant === 'trash-undo'">
                <span class="trash-toast-message flex-auto min-w-0 overflow-hidden text-[#ededf0] text-sm font-normal
                    leading-normal text-ellipsis whitespace-nowrap">{{ message }}</span>

                <div class="trash-toast-controls flex-none flex flex-nowrap items-center gap-3.5">
                    <button
                        v-if="actionLabel"
                        type="button"
                        class="trash-toast-undo flex-none inline-flex items-center justify-center min-h-7 py-1 px-3.5 border
                        border-[#414149] rounded-full bg-transparent text-[#ededf0] text-sm font-normal leading-tight
                        whitespace-nowrap cursor-pointer hover:enabled:bg-[#ffffff08] disabled:opacity-65
                        disabled:cursor-wait"
                        :disabled="pending"
                        @click="$emit('action')"
                    >
                        {{ pending ? 'Restoring...' : actionLabel }}
                    </button>

                    <button
                        type="button"
                        class="trash-toast-close flex-none inline-flex items-center justify-center p-0 border-0 bg-transparent
                        text-[#9393a3] cursor-pointer hover:text-[#ededf0] size-5"
                        @click="$emit('close')"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
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
                    class="toast-icon flex-none text-[#7bb5ff] group-[.error]/toast:text-[#ff8998]"
                    :name="
                        type === 'error' ? 'solar:close-circle-linear' : 'solar:check-circle-linear'
                    "
                    size="1rem"
                />

                <span class="toast-message min-w-0 text-[0.8rem] leading-normal whitespace-pre-line wrap-anywhere">{{ message }}</span>

                <button
                    v-if="actionLabel"
                    type="button"
                    class="toast-action flex-none ml-3 py-1 px-0 border-0 bg-transparent text-inherit text-[0.8rem]
                    font-semibold cursor-pointer hover:enabled:underline disabled:opacity-65 disabled:cursor-wait"
                    :disabled="pending"
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
