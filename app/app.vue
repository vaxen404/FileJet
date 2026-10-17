<script setup lang="ts">
import Toast from '~/components/ui/Toast.vue'

const { toastMessage, toastType, showToast } = useToast()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <Toast
    :show="showToast"
    :message="toastMessage"
    :type="toastType"
  />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:where(button, input[type='button'], input[type='submit'], input[type='reset']) {
  border-radius: 6px;
}

:where(input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']), textarea, select) {
  border-radius: 6px;
}

:where(input[type='checkbox']) {
  border-radius: 4px;
}

:where(dialog, [role='dialog'], [role='alertdialog']) {
  border-radius: 12px;
}

:where([role='tooltip']) {
  border-radius: 6px;
}

* {
  font-family: 'Inter', sans-serif;
}

body {
  margin: 0;
}
</style>
