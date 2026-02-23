<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../api/client.js';

const loading = ref(true);
const error = ref(null);
const petStatistics = ref([]);
const monthlyConsumption = ref({});
const summary = ref({});

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

const loadDashboardData = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const [petStatsResponse, monthlyResponse, summaryResponse] = await Promise.all([
      apiClient.get('/dashboard/pet-statistics'),
      apiClient.get(`/dashboard/monthly-consumption?year=${selectedYear.value}&month=${selectedMonth.value}`),
      apiClient.get('/dashboard/summary')
    ]);
    
    petStatistics.value = petStatsResponse;
    monthlyConsumption.value = monthlyResponse;
    summary.value = summaryResponse;
    
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

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="dashboard">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h2 mb-0">Dashboard</h1>
      <button class="btn btn-outline-primary btn-sm" @click="loadDashboardData" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Actualizar
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
                        <span class="badge bg-secondary">{{ stat.pet.age }} años</span>
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