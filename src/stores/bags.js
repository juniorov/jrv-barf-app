import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBagStore = defineStore('bags', () => {
  const needsRefresh = ref(false);
  const lastUpdate = ref(null);

  function markUpdated() {
    needsRefresh.value = true;
    lastUpdate.value = new Date();
  }

  function markRefreshed() {
    needsRefresh.value = false;
  }

  return {
    needsRefresh,
    lastUpdate,
    markUpdated,
    markRefreshed
  };
});