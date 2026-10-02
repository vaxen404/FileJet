<script setup lang="ts">
const { toastMessage, toastType, showToast } = useToast()
</script>

<template>
  <NuxtPage />

  <Toast
    :show="showToast"
    :message="toastMessage"
    :type="toastType"
  />
</template>