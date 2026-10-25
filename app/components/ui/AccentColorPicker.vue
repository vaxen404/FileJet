<template>
    <section aria-labelledby="accent-color-heading" class="rounded-xl border border-divider bg-surface px-5 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h2 id="accent-color-heading" class="text-sm font-semibold text-foreground">Accent color</h2>
                <p class="mt-1 text-xs text-muted">Saved in this browser.</p>
            </div>
            <fieldset>
                <legend class="sr-only">Accent color</legend>
                <div class="flex flex-wrap gap-2">
                    <label v-for="color in accentColors" :key="color.value" class="cursor-pointer">
                        <input v-model="model" type="radio" name="accent-color" :value="color.value" class="peer sr-only">
                        <span class="flex min-w-15 flex-col items-center gap-2 rounded-lg border border-transparent p-2 peer-checked:border-accent/40 peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                            <span class="flex size-7 items-center justify-center rounded-full border border-white/10" :style="{ backgroundColor: color.primary }">
                                <Icon v-if="model === color.value" name="solar:check-read-linear" size="16" class="text-white" />
                            </span>
                            <span class="text-[11px] text-secondary">{{ color.label }}</span>
                        </span>
                    </label>
                </div>
            </fieldset>
        </div>
    </section>
</template>

<script setup lang="ts">
import { accentColors, type AccentColor } from '~/utils/appearance'

const model = defineModel<AccentColor>({ required: true })
</script>
