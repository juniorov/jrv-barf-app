<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isOnline = ref(navigator.onLine);

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
};

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<template>
  <Transition name="offline">
    <div v-if="!isOnline" class="offline-banner" role="alert">
      <div class="offline-content">
        <i class="bi bi-wifi-off"></i>
        <span>Sin conexión a internet</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  bottom: calc(56px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  z-index: calc(var(--z-toast) - 1);
  background-color: var(--color-danger);
  color: white;
  padding: 10px 16px;
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

@media (min-width: 768px) {
  .offline-banner {
    bottom: 0;
  }
}

.offline-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.offline-content i {
  font-size: 1.1rem;
}

.offline-enter-active,
.offline-leave-active {
  transition: all 0.3s ease;
}

.offline-enter-from,
.offline-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
