<script setup lang="ts">
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

* {
  font-family: 'Inter', sans-serif;
}

body {
  margin: 0;
}
</style>