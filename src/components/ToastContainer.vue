<script setup>
import { useToastStore } from '../stores/toast.js';

const toastStore = useToastStore();

const getToastIcon = (type) => {
  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };
  return icons[type] || icons.info;
};

const getToastClass = (type) => {
  const classes = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info',
  };
  return classes[type] || classes.info;
};
</script>

<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item"
        :class="getToastClass(toast.type)"
        role="alert"
      >
        <div class="toast-content">
          <i :class="['bi', getToastIcon(toast.type), 'toast-icon']"></i>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button
          class="toast-close"
          @click="toastStore.removeToast(toast.id)"
          aria-label="Cerrar notificación"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(60px + env(safe-area-inset-top) + 16px);
  right: 16px;
  left: 16px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

@media (min-width: 768px) {
  .toast-container {
    left: auto;
    max-width: 420px;
  }
}

.toast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  animation: toastSlideIn 0.3s ease-out;
  backdrop-filter: blur(8px);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast-message {
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  opacity: 1;
}

.toast-success {
  background-color: var(--color-success-bg);
  color: #166534;
  border-left: 4px solid var(--color-success);
}

.toast-error {
  background-color: var(--color-danger-bg);
  color: #991B1B;
  border-left: 4px solid var(--color-danger);
}

.toast-warning {
  background-color: var(--color-warning-bg);
  color: #92400E;
  border-left: 4px solid var(--color-warning);
}

.toast-info {
  background-color: var(--color-info-bg);
  color: #075985;
  border-left: 4px solid var(--color-info);
}

.toast-enter-active {
  animation: toastSlideIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastSlideOut 0.2s ease-in;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateY(-16px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
