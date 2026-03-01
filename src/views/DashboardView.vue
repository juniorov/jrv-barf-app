<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import apiClient from '../api/client.js';

const loading = ref(true);
const error = ref(null);
const petStatistics = ref([]);
const monthlyConsumption = ref({
  hasData: false,
  consumption: [],
  totalRecords: 0,
  monthName: '',
  year: null
});
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

    // Cargar datos mensuales por separado
    await loadMonthlyData();

  } catch (err) {
    error.value = err.message || 'Error al cargar los datos del dashboard';
    console.error('❌ Error loading dashboard data:', err);
  } finally {
    loading.value = false;
  }
};

const loadMonthlyData = async () => {
  try {
    const response = await apiClient.get(`/dashboard/monthly-consumption?year=${selectedYear.value}&month=${selectedMonth.value}`);

    monthlyConsumption.value = {
      hasData: response?.hasData || false,
      consumption: response?.consumption || [],
      totalRecords: response?.totalRecords ?? 0,
      monthName: response?.monthName || months.find(m => m.value === selectedMonth.value)?.name || 'Mes desconocido',
      year: response?.year || selectedYear.value
    };

  } catch (err) {
    error.value = `Error al cargar datos de consumo mensual: ${err.message}`;
  }
};

// Watch para recargar datos cuando cambie el mes o año
watch([selectedYear, selectedMonth], () => {
  loadMonthlyData();
}, { immediate: false });

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

onMounted(async () => {
  await loadDashboardData();
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
                          <span class="badge bg-secondary">{{ getPetAge(stat.pet) }} años</span>
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
                              <strong>Se acaba el: </strong>
                              <span :class="stat.shouldBuyNow ? 'text-danger fw-bold' : 'text-muted'">
                                {{ formatDate(stat.projectedEmptyDate) }}
                              </span>
                            </div>
                            <div v-if="stat.recommendedPurchaseDate">
                              <strong>Comprar antes del: </strong>
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
                <div class="d-flex gap-2 align-items-center">
                  <select v-model="selectedMonth" class="form-select form-select-sm">
                    <option v-for="month in months" :key="month.value" :value="month.value">
                      {{ month.name }}
                    </option>
                  </select>
                  <select v-model="selectedYear" class="form-select form-select-sm">
                    <option :value="2024">2024</option>
                    <option :value="2025">2025</option>
                    <option :value="2026">2026</option>
                  </select>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    @click="loadMonthlyData"
                    title="Recargar datos del consumo mensual"
                  >
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body">
              <h6 class="text-muted mb-3">
                {{ monthlyConsumption.monthName || months.find(m => m.value === selectedMonth)?.name }} {{ monthlyConsumption.year || selectedYear }}
                <span v-if="monthlyConsumption.totalRecords != null && monthlyConsumption.totalRecords > 0" class="badge bg-info ms-2">
                  {{ monthlyConsumption.totalRecords }} registros
                </span>
              </h6>

              <div v-if="!monthlyConsumption.hasData || (monthlyConsumption.consumption && monthlyConsumption.consumption.length === 0)" class="text-center py-4">
                <i class="bi bi-info-circle text-muted fs-1 mb-3"></i>
                <p class="text-muted mb-2">No hay datos de consumo para {{ months.find(m => m.value === selectedMonth)?.name }} {{ selectedYear }}</p>
                <small class="text-muted">
                  Los datos se generan automáticamente cuando:<br>
                  • Se registran días de comida para las mascotas<br>
                  • Se completan bolsas y se asignan al inventario<br>
                  • Se actualiza forzadamente el inventario desde el dashboard
                </small>
              </div>
              <div v-else-if="monthlyConsumption.consumption && monthlyConsumption.consumption.length > 0" class="row">
                <div v-for="item in monthlyConsumption.consumption" :key="item.ingredient" class="col-md-4 mb-3">
                  <div class="card border-0 bg-light">
                    <div class="card-body text-center">
                      <h6 class="fw-bold text-capitalize">{{ item.ingredient }}</h6>
                      <div class="fs-4 text-primary fw-bold">{{ item.amount }}g</div>
                      <small class="text-muted">Total consumido</small>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando consumo mensual...</span>
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