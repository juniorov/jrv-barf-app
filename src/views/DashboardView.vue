<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import apiClient from '../api/client.js';
import { useBagStore } from '../stores/bags.js';

const bagStore = useBagStore();

const loading = ref(true);
const error = ref(null);
const petStatistics = ref([]);
const summary = ref({});
const inventoryStatus = ref([]);
const forceUpdateLoading = ref({});
const autoUpdateInterval = ref(null);
const lastDashboardUpdate = ref(null);

// Función para calcular edad en el frontend (igual que en PetsView)
const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  // Calcular años, meses y días transcurridos
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  
  // Ajustar si no ha pasado el día del cumpleaños este mes
  if (days < 0) {
    months--;
    // Obtener días del mes anterior
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  // Ajustar si no ha pasado el mes del cumpleaños este año
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Convertir a años decimales (meses / 12 + días / 365)
  const ageInYears = years + (months / 12) + (days / 365);
  
  return Math.max(0, Math.round(ageInYears * 10) / 10); // Redondear a 1 decimal
};

const calculateRealAge = (humanAge) => {
  if (!humanAge || humanAge <= 0) return 0;
  if (humanAge <= 15) return humanAge / 15;
  if (humanAge <= 24) return 2;
  return 2 + (humanAge - 24) / 4;
};

// Función para obtener la edad de una mascota correctamente formateada
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

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getUpdateStatusBadge = (petInfo) => {
  if (!petInfo) return { class: 'bg-secondary', text: 'Sin info' };

  const minutes = petInfo.minutesSinceUpdate || 0;
  if (minutes < 30) return { class: 'bg-success', text: 'Actualizado' };
  if (minutes < 60) return { class: 'bg-info', text: 'Reciente' };
  if (minutes < 1440) return { class: 'bg-warning text-dark', text: 'Hoy' }; // 24 horas
  return { class: 'bg-danger', text: 'Desactualizado' };
};

const loadDashboardData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const [petStatsResponse, summaryResponse, inventoryResponse] = await Promise.all([
      apiClient.get('/dashboard/pet-statistics'),
      apiClient.get('/dashboard/summary'),
      apiClient.get('/pets/inventory-status')
    ]);

    petStatistics.value = petStatsResponse;
    summary.value = summaryResponse;
    inventoryStatus.value = inventoryResponse.pets || [];
    lastDashboardUpdate.value = new Date();

  } catch (err) {
    error.value = err.message || 'Error al cargar los datos del dashboard';
    console.error('❌ Error loading dashboard data:', err);
  } finally {
    loading.value = false;
  }
};

const forceInventoryUpdate = async (petId, petName) => {
  try {
    forceUpdateLoading.value[petId] = true;
    error.value = null;

    const response = await apiClient.post(`/pets/${petId}/force-inventory-update`);

    // Recargar los datos del dashboard
    await loadDashboardData();

    // Mostrar mensaje de éxito detallado

  } catch (err) {
    console.error('Error updating inventory:', err);
    error.value = `Error al actualizar inventario de ${petName}: ${err.message}`;
  } finally {
    forceUpdateLoading.value[petId] = false;
  }
};

const getPetInventoryInfo = (petId) => {
  return inventoryStatus.value.find(status => status.petId === petId);
};

// Función para actualizar solo el status de inventario (más liviano)
const updateInventoryStatus = async () => {
  try {
    const inventoryResponse = await apiClient.get('/pets/inventory-status');
    inventoryStatus.value = inventoryResponse.pets || [];
    lastDashboardUpdate.value = new Date();
  } catch (err) {
    console.error('Error updating inventory status:', err);
  }
};

// Iniciar actualización automática cada 30 segundos
const startAutoUpdate = () => {
  // Limpiar intervalo existente si hay uno
  if (autoUpdateInterval.value) {
    clearInterval(autoUpdateInterval.value);
  }

  // Actualizar cada 30 segundos solo el status de inventario
  autoUpdateInterval.value = setInterval(() => {
    if (document.visibilityState === 'visible') {
      updateInventoryStatus();
    }
  }, 30000); // 30 segundos
};

// Parar actualización automática
const stopAutoUpdate = () => {
  if (autoUpdateInterval.value) {
    clearInterval(autoUpdateInterval.value);
    autoUpdateInterval.value = null;
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
});

onUnmounted(() => {
  stopAutoUpdate();
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
          Auto cada 30s
          <span v-if="lastDashboardUpdate" class="text-success ms-1">
            · {{ lastDashboardUpdate.toLocaleTimeString() }}
          </span>
        </small>
      </div>
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

    <!-- Error message -->
    <div v-if="error" class="alert alert-danger mb-4" role="alert">
      <i class="bi bi-exclamation-circle me-2"></i>
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="loading && petStatistics.length === 0" class="text-center py-5">
      <div class="spinner-border mb-3" role="status" style="color: var(--color-primary);"></div>
      <p style="color: var(--color-text-secondary);">Cargando estadísticas...</p>
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