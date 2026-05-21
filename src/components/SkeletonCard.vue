<template>
  <div class="skeleton-card" :style="{ height: height }">
    <div class="skeleton-content">
      <div class="skeleton-header">
        <div class="skeleton-circle" style="width: 24px; height: 24px;"></div>
        <div class="skeleton-line" style="width: 40%;"></div>
      </div>
      <div class="skeleton-stats">
        <div class="skeleton-box" v-for="i in 2" :key="i"></div>
      </div>
      <div class="skeleton-line" style="width: 80%;"></div>
      <div class="skeleton-line" style="width: 60%;"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  height: {
    type: String,
    default: '200px'
  }
});
</script>

<style scoped>
.skeleton-card {
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  padding: var(--spacing-4);
  overflow: hidden;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skeleton-stats {
  display: flex;
  gap: 12px;
}

.skeleton-box {
  flex: 1;
  height: 60px;
  border-radius: var(--radius-md);
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
}

.skeleton-circle,
.skeleton-box,
.skeleton-line {
  background: linear-gradient(
    90deg,
    var(--color-muted) 25%,
    var(--color-border) 50%,
    var(--color-muted) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
