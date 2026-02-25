<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import apiClient from '../api/client.js';

const loading = ref(true);
const error = ref(null);
const petStatistics = ref([]);
const monthlyConsumption = ref({});
const summary = ref({});
const inventoryStatus = ref([]);
const forceUpdateLoading = ref({});
const autoUpdateInterval = ref(null);
const lastDashboardUpdate = ref(null);

// Datos para el selector de mes
const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());
const selectedMonth = ref(currentDate.getMonth() + 1);

const months = [
  { value: 1, name: 'Enero' },
  { value: 2, name: 'Febrero' },
  { value: 3, name: 'Marzo' },
  { value: 4, name: 'Abril' },
  { value: 5, name: 'Mayo' },
  { value: 6, name: 'Junio' },
  { value: 7, name: 'Julio' },
  { value: 8, name: 'Agosto' },
  { value: 9, name: 'Septiembre' },
  { value: 10, name: 'Octubre' },
  { value: 11, name: 'Noviembre' },
  { value: 12, name: 'Diciembre' }
];

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

    const [petStatsResponse, monthlyResponse, summaryResponse, inventoryResponse] = await Promise.all([
      apiClient.get('/dashboard/pet-statistics'),
      apiClient.get(`/dashboard/monthly-consumption?year=${selectedYear.value}&month=${selectedMonth.value}`),
      apiClient.get('/dashboard/summary'),
      apiClient.get('/pets/inventory-status')
    ]);

    petStatistics.value = petStatsResponse;
    monthlyConsumption.value = monthlyResponse;
    summary.value = summaryResponse;
    inventoryStatus.value = inventoryResponse.pets || [];
    lastDashboardUpdate.value = new Date();

    // Debug: mostrar información del servidor sobre zona horaria
    if (inventoryResponse.serverTime) {
      console.log('🕒 Hora del servidor (Costa Rica):', inventoryResponse.serverTime);
      console.log('🌍 Zona horaria:', inventoryResponse.timezone);
    }

  } catch (err) {
    error.value = err.message || 'Error al cargar los datos del dashboard';
    console.error('Error loading dashboard data:', err);
  } finally {
    loading.value = false;
  }
};

const loadMonthlyData = async () => {
  try {
    const response = await apiClient.get(`/dashboard/monthly-consumption?year=${selectedYear.value}&month=${selectedMonth.value}`);
    monthlyConsumption.value = response;
  } catch (err) {
    console.error('Error loading monthly data:', err);
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
    if (response.result && response.result.consumedMeals > 0) {
      console.log(`✅ ${response.message}. Comidas consumidas: ${response.result.consumedMeals}`);
    } else {
      console.log(`ℹ️ ${response.message}`);
    }

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
    console.log('☀️ Dashboard actualizado automáticamente:', lastDashboardUpdate.value.toLocaleTimeString());
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

onMounted(() => {
  loadDashboardData();
  startAutoUpdate();
});

onUnmounted(() => {
  stopAutoUpdate();
});
</script>

<template>
  <div class="dashboard">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h2 mb-0">Dashboard</h1>
        <small class="text-muted">
          Se actualiza automáticamente cada 30 seg
          <span v-if="lastDashboardUpdate" class="text-success ms-1">
            (Última: {{ lastDashboardUpdate.toLocaleTimeString() }})
          </span>
        </small>
      </div>
      <button class="btn btn-outline-primary btn-sm" @click="loadDashboardData" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status"></span>
        <i v-else class="bi bi-arrow-clockwise me-1"></i>
        {{ loading ? 'Actualizando...' : 'Actualizar' }}
      </button>
    </div>

    <!-- Loading spinner -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2 text-muted">Cargando estadísticas...</p>
    </div>

    <!-- Error message -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-circle me-2"></i>
      {{ error }}
    </div>

    <!-- Dashboard content -->
    <div v-else>
      <!-- Resumen general -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card bg-primary text-white">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <i class="bi bi-heart-fill fs-2 me-3"></i>
                <div>
                  <h3 class="card-title mb-0">{{ summary.totalPets }}</h3>
                  <p class="card-text">Mascotas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-success text-white">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill fs-2 me-3"></i>
                <div>
                  <h3 class="card-title mb-0">{{ summary.completedBags }}</h3>
                  <p class="card-text">Bolsas Completas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-warning text-dark">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <i class="bi bi-clock-fill fs-2 me-3"></i>
                <div>
                  <h3 class="card-title mb-0">{{ summary.incompleteBags }}</h3>
                  <p class="card-text">Bolsas Incompletas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-info text-white">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <i class="bi bi-basket3-fill fs-2 me-3"></i>
                <div>
                  <h3 class="card-title mb-0">{{ summary.totalIngredients }}</h3>
                  <p class="card-text">Ingredientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas por mascota -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-graph-up me-2"></i>
                Estadísticas por Mascota
              </h5>
            </div>
            <div class="card-body">
              <div v-if="petStatistics.length === 0" class="text-center py-3">
                <p class="text-muted mb-0">No tienes mascotas registradas aún.</p>
                <RouterLink to="/app/pets" class="btn btn-primary btn-sm mt-2">
                  Agregar Primera Mascota
                </RouterLink>
              </div>
              <div v-else class="row">
                <div v-for="stat in petStatistics" :key="stat.pet.id" class="col-lg-6 mb-3">
                  <div class="card h-100">
                    <div class="card-header bg-light">
                      <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">{{ stat.pet.name }}</h6>
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge bg-secondary">{{ stat.pet.age }} años</span>
                          <span
                            v-if="getPetInventoryInfo(stat.pet.id)"
                              :class="['badge', getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).class]"
                            >
                              {{ getUpdateStatusBadge(getPetInventoryInfo(stat.pet.id)).text }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="card-body">
                      <div class="row g-3">
                        <div class="col-6">
                          <div class="text-center p-2 bg-light rounded">
                            <div class="fw-bold text-success fs-4">{{ stat.completeBags }}</div>
                            <small class="text-muted">Bolsas Completas</small>
                          </div>
                        </div>
                        <div class="col-6">
                          <div class="text-center p-2 bg-light rounded">
                            <div class="fw-bold text-warning fs-4">{{ stat.incompleteBagsCount }}</div>
                            <small class="text-muted">Bolsas Incompletas</small>
                          </div>
                        </div>
                        <div class="col-12">
                          <div class="p-2 bg-light rounded">
                            <div class="mb-2">
                              <strong>Comidas diarias:</strong> {{ stat.pet.mealsPerDay }}
                            </div>
                            <div v-if="stat.pet.feedingTimes && stat.pet.feedingTimes.length > 0" class="mb-2">
                              <strong>Horarios:</strong> {{ stat.pet.feedingTimes.join(', ') }}
                            </div>
                            <div class="mb-2">
                              <strong>Se acaba el:</strong>
                              <span :class="stat.shouldBuyNow ? 'text-danger fw-bold' : 'text-muted'">
                                {{ formatDate(stat.projectedEmptyDate) }}
                              </span>
                            </div>
                            <div v-if="stat.recommendedPurchaseDate">
                              <strong>Comprar antes del:</strong>
                              <span :class="stat.shouldBuyNow ? 'text-danger fw-bold' : 'text-success'">
                                {{ formatDate(stat.recommendedPurchaseDate) }}
                              </span>
                              <span v-if="stat.shouldBuyNow" class="badge bg-danger ms-2">
                                ¡Comprar ahora!
                              </span>
                            </div>
                            <div v-if="getPetInventoryInfo(stat.pet.id)" class="mt-2 pt-2 border-top">
                              <div class="d-flex justify-content-between align-items-center mb-1">
                                <button
                                  class="btn btn-outline-primary btn-sm"
                                  :disabled="forceUpdateLoading[stat.pet.id]"
                                  @click="forceInventoryUpdate(stat.pet.id, stat.pet.name)"
                                >
                                  <span v-if="forceUpdateLoading[stat.pet.id]" class="spinner-border spinner-border-sm me-1" role="status"></span>
                                  <i v-else class="bi bi-arrow-clockwise me-1"></i>
                                  {{ forceUpdateLoading[stat.pet.id] ? 'Actualizando...' : 'Forzar' }}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Consumo mensual -->
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">
                  <i class="bi bi-calendar3 me-2"></i>
                  Consumo por Ingrediente
                </h5>
                <div class="d-flex gap-2">
                  <select v-model="selectedMonth" @change="loadMonthlyData" class="form-select form-select-sm">
                    <option v-for="month in months" :key="month.value" :value="month.value">
                      {{ month.name }}
                    </option>
                  </select>
                  <select v-model="selectedYear" @change="loadMonthlyData" class="form-select form-select-sm">
                    <option :value="2024">2024</option>
                    <option :value="2025">2025</option>
                    <option :value="2026">2026</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="card-body">
              <h6 class="text-muted mb-3">{{ monthlyConsumption.monthName }} {{ monthlyConsumption.year }}</h6>
              <div v-if="!monthlyConsumption.hasData || (monthlyConsumption.consumption && monthlyConsumption.consumption.length === 0)" class="text-center py-4">
                <i class="bi bi-info-circle text-muted fs-1 mb-3"></i>
                <p class="text-muted mb-2">No hay datos de consumo para este período</p>
                <small class="text-muted">
                  Los datos se generan automáticamente cuando las mascotas consumen sus comidas diarias
                </small>
              </div>
              <div v-else-if="monthlyConsumption.consumption" class="row">
                <div v-for="item in monthlyConsumption.consumption" :key="item.ingredient" class="col-md-4 mb-3">
                  <div class="card border-0 bg-light">
                    <div class="card-body text-center">
                      <h6 class="fw-bold text-capitalize">{{ item.ingredient }}</h6>
                      <div class="fs-4 text-primary fw-bold">{{ item.amount }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard .card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  border: 1px solid rgba(0, 0, 0, 0.125);
}

.dashboard .card-header {
  background-color: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.125);
}

.dashboard .bg-light {
  background-color: #f8f9fa !important;
}

@media (max-width: 768px) {
  .dashboard .row > .col-md-3 {
    margin-bottom: 1rem;
  }
}
</style>