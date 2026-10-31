<template>
    <span class="block h-12 w-13 shrink-0 overflow-hidden" aria-hidden="true">
        <img
            class="-ml-4 h-12 w-40 max-w-none object-cover"
            src="/images/filejetlogo.png"
            alt=""
            :style="{ filter: logoFilter }"
        />
    </span>
</template>

<script setup lang="ts">
import type { AccentColor } from '~/utils/appearance'

const props = defineProps<{ accentColor?: AccentColor }>()
const { preferences } = usePreferences()
// Native filters keep the PNG visible without SVG fragment IDs or hidden filter definitions.
const filters: Record<AccentColor, string> = {
    indigo: 'hue-rotate(30deg)',
    blue: 'none',
    violet: 'hue-rotate(50deg)',
    emerald: 'hue-rotate(290deg)',
    rose: 'hue-rotate(110deg)',
    amber: 'hue-rotate(180deg)'
}
const logoFilter = computed(() => filters[props.accentColor ?? preferences.value.accentColor] ?? 'none')
</script>
