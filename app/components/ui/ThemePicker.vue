<template>
    <fieldset class="theme-picker">
        <legend class="text-sm font-semibold text-foreground">Theme</legend>
        <p class="mt-1 text-xs leading-5 text-muted">Choose your workspace appearance.</p>
        <div class="mt-4 grid grid-cols-3 gap-2">
            <label v-for="option in themeModes" :key="option.value" class="theme-choice">
                <input v-model="model" type="radio" :name="id" :value="option.value" class="peer sr-only">
                <span class="theme-choice-card" :class="{ 'is-selected': model === option.value }">
                    <span class="theme-sample" :class="`theme-sample--${option.value}`" aria-hidden="true">
                        <span class="theme-sample-sidebar" />
                        <span class="theme-sample-content"><i /><i /><i /></span>
                        <span v-if="model === option.value" class="theme-choice-check"><Icon name="solar:check-read-linear" size="12" /></span>
                    </span>
                    <span class="theme-choice-label"><Icon :name="option.icon" size="15" aria-hidden="true" />{{ option.label }}</span>
                </span>
            </label>
        </div>
        <p class="mt-3 text-xs leading-5 text-muted">{{ model === 'system' ? 'Switches automatically with your device settings.' : model === 'light' ? 'A bright workspace with soft borders and clear text.' : 'A calm, dark workspace for any time of day.' }}</p>
    </fieldset>
</template>

<script setup lang="ts">
import { themeModes, type ThemeMode } from '~/utils/themes'
const model = defineModel<ThemeMode>({ required: true })
const id = `theme-${useId()}`
</script>
