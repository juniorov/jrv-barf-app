<template>
  <router-view />
  <PWAInstallPrompt />
  <ToastContainer />
  <OfflineIndicator />
</template>

<script setup>
import PWAInstallPrompt from './components/PWAInstallPrompt.vue'
import ToastContainer from './components/ToastContainer.vue'
import OfflineIndicator from './components/OfflineIndicator.vue'
</script>
