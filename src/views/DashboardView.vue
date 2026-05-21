<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import api from '../api/client.js';
import { useBagStore } from '../stores/bags.js';
import { useToastStore } from '../stores/toast.js';
import { calculateAge, calculateRealAge } from '../utils/age.js';
import SkeletonCard from '../components/SkeletonCard.vue';

const bagStore = useBagStore();
const toast = useToastStore();

const loading = ref(true);
const error = ref(null);
const petStatistics = ref([]);
const summary = ref({});
const inventoryStatus = ref([]);
const forceUpdateLoading = ref({});
const autoUpdateInterval = ref(null);
const lastDashboardUpdate = ref(null);
const autoUpdateEnabled = ref(true);

const getPetAge = (pet) => {
  if (pet.birthDate) {
    return calculateAge(pet.birthDate);
  }
  return Number(pet.age || 0).toFixed(1);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getUpdateStatusBadge = (petInfo) => {
  if (!petInfo) return { class: 'bg-secondary', text: 'Sin info' };

  const minutes = petInfo.minutesSinceUpdate || 0;
  if (minutes < 30) return { class: 'bg-success', text: 'Actualizado' };
  if (minutes < 60) return { class: 'bg-info', text: 'Reciente' };
  if (minutes < 1440) return { class: 'bg-warning text-dark', text: 'Hoy' };
  return { class: 'bg-danger', text: 'Desactualizado' };
};

const loadDashboardData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const [petStatsResponse, summaryResponse, inventoryResponse] = await Promise.all([
      api.get('/dashboard/pet-statistics'),
      api.get('/dashboard/summary'),
      api.get('/pets/inventory-status')
    ]);

    petStatistics.value = petStatsResponse;
    summary.value = summaryResponse;
    inventoryStatus.value = inventoryResponse.pets || [];
    lastDashboardUpdate.value = new Date();

  } catch (err) {
    error.value = err.message || 'Error al cargar los datos del dashboard';
  } finally {
    loading.value = false;
  }
};

const forceInventoryUpdate = async (petId, petName) => {
  try {
    forceUpdateLoading.value[petId] = true;
    error.value = null;

    await api.post(`/pets/${petId}/force-inventory-update`);
    await loadDashboardData();
    toast.success(`Inventario de ${petName} actualizado`);

  } catch (err) {
    toast.error(`Error al actualizar inventario de ${petName}: ${err.message}`);
  } finally {
    forceUpdateLoading.value[petId] = false;
  }
};

const getPetInventoryInfo = (petId) => {
  return inventoryStatus.value.find(status => status.petId === petId);
};

const updateInventoryStatus = async () => {
  try {
    const inventoryResponse = await api.get('/pets/inventory-status');
    inventoryStatus.value = inventoryResponse.pets || [];
    lastDashboardUpdate.value = new Date();
  } catch (err) {
    // Silenciar errores en auto-update
  }
};

// Iniciar actualización automática cada 60 segundos
const startAutoUpdate = () => {
  if (autoUpdateInterval.value) {
    clearInterval(autoUpdateInterval.value);
  }

  autoUpdateInterval.value = setInterval(() => {
    if (autoUpdateEnabled.value && document.visibilityState === 'visible') {
      updateInventoryStatus();
    }
  }, 60000); // 60 segundos
};

// Parar actualización automática
const stopAutoUpdate = () => {
  if (autoUpdateInterval.value) {
    clearInterval(autoUpdateInterval.value);
    autoUpdateInterval.value = null;
  }
};

const toggleAutoUpdate = () => {
  autoUpdateEnabled.value = !autoUpdateEnabled.value;
  if (autoUpdateEnabled.value) {
    toast.info('Auto-actualización activada');
  } else {
    toast.info('Auto-actualización pausada');
  }
};

// Pausar cuando la pestaña está en background
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    stopAutoUpdate();
  } else if (autoUpdateEnabled.value) {
    startAutoUpdate();
  }
};

// Watch para detectar cuando se completa una bolsa y actualizar el dashboard
watch(() => bagStore.needsRefresh, (needsRefresh) => {
  if (needsRefresh) {
    loadDashboardData();
    bagStore.markRefreshed();
  }
});

onMounted(async () => {
  await loadDashboardData();
  startAutoUpdate();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopAutoUpdate();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div class="dashboard fade-in">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-start mb-4">
      <div>
        <h1 class="h3 mb-1" style="color: var(--color-text-primary);">Dashboard</h1>
        <small style="color: var(--color-text-secondary);">
          <i class="bi bi-arrow-repeat me-1"></i>
          Auto cada 60s
          <span v-if="autoUpdateEnabled" class="text-success ms-1">
            <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
          </span>
          <span v-else class="text-warning ms-1">
            <i class="bi bi-pause-circle-fill" style="font-size: 0.6rem;"></i> Pausado
          </span>
          <span v-if="lastDashboardUpdate" class="ms-1">
            · {{ lastDashboardUpdate.toLocaleTimeString() }}
          </span>
        </small>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-sm"
          :class="autoUpdateEnabled ? 'btn-outline-success' : 'btn-outline-warning'"
          @click="toggleAutoUpdate"
          :aria-label="autoUpdateEnabled ? 'Pausar auto-actualización' : 'Reanudar auto-actualización'"
        >
          <i :class="autoUpdateEnabled ? 'bi bi-pause' : 'bi bi-play-fill'"></i>
          <span class="d-none d-sm-inline ms-1">{{ autoUpdateEnabled ? 'Pausar' : 'Reanudar' }}</span>
        </button>
        <button 
          class="btn btn-outline-primary btn-sm" 
          @click="loadDashboardData" 
          :disabled="loading"
          aria-label="Actualizar dashboard"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status"></span>
          <i v-else class="bi bi-arrow-clockwise me-1"></i>
          <span class="d-none d-sm-inline">{{ loading ? 'Actualizando...' : 'Actualizar' }}</span>
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="alert alert-danger mb-4" role="alert">
      <i class="bi bi-exclamation-circle me-2"></i>
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="loading && petStatistics.length === 0" class="row g-3 g-md-4">
      <div class="col-12 col-md-6">
        <SkeletonCard />
      </div>
      <div class="col-12 col-md-6">
        <SkeletonCard />
      </div>
    </div>

    <!-- Dashboard content -->
    <div v-else-if="petStatistics.length > 0">
      <!-- Pet Statistics Cards -->
      <div class="row g-3 g-md-4">
        <div v-for="stat in petStatistics" :key="stat.pet.id" class="col-12 col-md-6">
          <div class="card h-100">
            <!-- Card Header -->
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0 fw-bold" style="color: var(--color-text-primary);">
                <i class="bi bi-heart-fill me-2" style="color: var(--color-primary);"></i>
                {{ stat.pet.name }}
              </h6>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="badge" style="background-color: var(--color-muted); color: var(--color-text-secondary);">
                  {{ getPetAge(stat.pet) }} años
                </span>
                <span
                  v-if="getPetInventoryInfo(stat.pet.id)"
                  class="badge"
                  :style="{
                    backgroundColor: getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).class.includes('success') ? 'var(--color-success)' :
                                    getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).class.includes('info') ? 'var(--color-info)' :
                                    getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).class.includes('warning') ? 'var(--color-warning)' :
                                    'var(--color-danger)',
                    color: 'white'
                  }"
                >
                  {{ getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).text }}
                </span>
              </div>
            </div>
            
            <!-- Card Body -->
            <div class="card-body">
              <!-- Stats Grid -->
              <div class="row g-3 mb-3">
                <div class="col-6">
                  <div class="text-center p-3 rounded" style="background-color: var(--color-success-bg);">
                    <div class="fw-bold fs-4" style="color: var(--color-success);">{{ stat.completeBags }}</div>
                    <small style="color: var(--color-text-secondary);">Bolsas Completas</small>
                  </div>
                </div>
                <div class="col-6">
                  <div class="text-center p-3 rounded" style="background-color: var(--color-warning-bg);">
                    <div class="fw-bold fs-4" style="color: var(--color-warning);">{{ stat.incompleteBagsCount }}</div>
                    <small style="color: var(--color-text-secondary);">Incompletas</small>
                  </div>
                </div>
              </div>

              <!-- Info Section -->
              <div class="p-3 rounded mb-3" style="background-color: var(--color-muted);">
                <div class="mb-2 d-flex justify-content-between">
                  <span style="color: var(--color-text-secondary);">Comidas diarias:</span>
                  <strong>{{ stat.pet.mealsPerDay }}</strong>
                </div>
                <div v-if="stat.pet.feedingTimes && stat.pet.feedingTimes.length > 0" class="mb-2 d-flex justify-content-between">
                  <span style="color: var(--color-text-secondary);">Horarios:</span>
                  <strong>{{ stat.pet.feedingTimes.join(', ') }}</strong>
                </div>
                <div class="mb-2 d-flex justify-content-between align-items-center">
                  <span style="color: var(--color-text-secondary);">Se acaba el:</span>
                  <span :style="{
                    color: stat.shouldBuyNow ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                    fontWeight: stat.shouldBuyNow ? '600' : '400'
                  }">
                    {{ formatDate(stat.projectedEmptyDate) }}
                  </span>
                </div>
                <div v-if="stat.recommendedPurchaseDate" class="d-flex justify-content-between align-items-center">
                  <span style="color: var(--color-text-secondary);">Comprar antes del:</span>
                  <div>
                    <span :style="{
                      color: stat.shouldBuyNow ? 'var(--color-danger)' : 'var(--color-success)',
                      fontWeight: stat.shouldBuyNow ? '600' : '400'
                    }">
                      {{ formatDate(stat.recommendedPurchaseDate) }}
                    </span>
                    <span v-if="stat.shouldBuyNow" class="badge ms-2" style="background-color: var(--color-danger); color: white;">
                      ¡Comprar!
                    </span>
                  </div>
                </div>
              </div>

              <!-- Force Update Button -->
              <div v-if="getPetInventoryInfo(stat.pet.id)" class="pt-3" style="border-top: 1px solid var(--color-border);">
                <button
                  class="btn btn-outline-primary btn-sm w-100"
                  :disabled="forceUpdateLoading[stat.pet.id]"
                  @click="forceInventoryUpdate(stat.pet.id, stat.pet.name)"
                >
                  <span v-if="forceUpdateLoading[stat.pet.id]" class="spinner-border spinner-border-sm me-1" role="status"></span>
                  <i v-else class="bi bi-arrow-clockwise me-1"></i>
                  {{ forceUpdateLoading[stat.pet.id] ? 'Actualizando...' : 'Forzar Actualización' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <i class="bi bi-inbox mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
      <p class="mb-3" style="color: var(--color-text-secondary);">No tienes mascotas registradas aún.</p>
      <RouterLink to="/app/pets" class="btn btn-primary">
        <i class="bi bi-plus-circle me-2"></i>
        Agregar Primera Mascota
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.dashboard .card {
  transition: all var(--transition-base);
}

.dashboard .card:hover {
  box-shadow: var(--shadow-md);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard .card {
    transition: none;
  }
}
</style>