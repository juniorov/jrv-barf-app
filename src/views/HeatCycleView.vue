<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';
import { useToastStore } from '../stores/toast.js';

const toast = useToastStore();

const pets = ref([]);
const selectedPetId = ref('');
const cycles = ref([]);
const prediction = ref(null);
const loading = ref(false);
const predicting = ref(false);
const newDate = ref('');
const newNotes = ref('');
const showForm = ref(false);

const selectedPet = computed(() => {
  return pets.value.find(p => p._id === selectedPetId.value);
});

const loadPets = async () => {
  try {
    pets.value = await api.get('/pets');
  } catch (e) {
    toast.error(e.message || 'No se pudieron cargar las mascotas');
  }
};

const loadCycles = async () => {
  if (!selectedPetId.value) return;
  loading.value = true;
  try {
    const data = await api.get(`/heatcycles/${selectedPetId.value}`);
    cycles.value = data.cycles || [];
  } catch (e) {
    toast.error(e.message || 'No se pudieron cargar los registros');
  } finally {
    loading.value = false;
  }
};

const loadPrediction = async () => {
  if (!selectedPetId.value) return;
  predicting.value = true;
  try {
    const data = await api.get(`/heatcycles/${selectedPetId.value}/predict`);
    prediction.value = data.prediction;
    cycles.value = data.cycles || [];
    return data;
  } catch (e) {
    toast.error(e.message || 'Error al calcular predicción');
    return null;
  } finally {
    predicting.value = false;
  }
};

const onPetChange = async () => {
  newDate.value = '';
  newNotes.value = '';
  showForm.value = false;
  cycles.value = [];
  prediction.value = null;
  if (selectedPetId.value) {
    await loadPrediction();
  }
};

const addCycle = async () => {
  if (!newDate.value) {
    toast.error('Selecciona una fecha');
    return;
  }
  if (!selectedPetId.value) return;

  try {
    await api.post(`/heatcycles/${selectedPetId.value}`, {
      startDate: newDate.value,
      notes: newNotes.value,
    });
    toast.success('Celo registrado correctamente');
    newDate.value = '';
    newNotes.value = '';
    showForm.value = false;
    await loadPrediction();
  } catch (e) {
    toast.error(e.message || 'No se pudo registrar el celo');
  }
};

const deleteCycle = async (id) => {
  if (!confirm('¿Eliminar este registro de celo?')) return;
  try {
    await api.delete(`/heatcycles/${id}`);
    toast.success('Registro eliminado');
    await loadPrediction();
  } catch (e) {
    toast.error(e.message || 'No se pudo eliminar el registro');
  }
};

const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

onMounted(() => {
  loadPets();
});
</script>

<template>
  <div class="fade-in">
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Control de Celos</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Registra los celos de tu perra y predice los próximos
      </p>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <label class="form-label">Seleccionar mascota</label>
        <select
          v-model="selectedPetId"
          class="form-select"
          @change="onPetChange"
        >
          <option value="" disabled>-- Selecciona una mascota --</option>
          <option v-for="pet in pets" :key="pet._id" :value="pet._id">
            {{ pet.name }}
          </option>
        </select>
      </div>
    </div>

    <template v-if="selectedPetId">
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="h6 mb-0">
            <i class="bi bi-calendar-heart me-2" style="color: var(--color-primary);"></i>
            Fechas de celo registradas
            <span v-if="cycles.length" class="badge ms-2" style="background-color: var(--color-primary);">
              {{ cycles.length }}
            </span>
          </h3>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="showForm = !showForm"
          >
            <i class="bi bi-plus-circle me-1"></i>
            {{ showForm ? 'Cancelar' : 'Nuevo celo' }}
          </button>
        </div>

        <div v-if="showForm" class="card-body" style="border-bottom: 1px solid var(--color-border);">
          <form @submit.prevent="addCycle">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">Fecha de inicio del sangrado *</label>
                <input
                  v-model="newDate"
                  type="date"
                  class="form-control"
                  required
                />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Notas (opcional)</label>
                <input
                  v-model="newNotes"
                  type="text"
                  class="form-control"
                  placeholder="Ej: Celo leve, duración 15 días"
                />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check-circle me-1"></i>
                  Registrar celo
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>Cargando...
          </div>
          <div v-else-if="!cycles.length" class="text-center py-4">
            <i class="bi bi-inbox mb-2" style="font-size: 2rem; color: var(--color-text-muted);"></i>
            <p class="mb-0" style="color: var(--color-text-secondary);">
              No hay celos registrados para {{ selectedPet?.name }}
            </p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha de inicio</th>
                  <th>Notas</th>
                  <th style="width: 80px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(cycle, i) in cycles" :key="cycle._id">
                  <td class="text-muted">{{ i + 1 }}</td>
                  <td class="fw-semibold">{{ cycle.formattedDate || formatDisplayDate(cycle.startDate) }}</td>
                  <td style="color: var(--color-text-secondary);">{{ cycle.notes || '—' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      @click="deleteCycle(cycle._id)"
                      aria-label="Eliminar"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="predicting" class="text-center py-4">
        <span class="spinner-border spinner-border-sm me-2"></span>Calculando predicción...
      </div>

      <div v-else-if="prediction" class="card" style="border-color: var(--color-primary);">
        <div class="card-header" style="background-color: var(--color-success-bg);">
          <h3 class="h6 mb-0" style="color: var(--color-text-primary);">
            <i class="bi bi-graph-up-arrow me-2" style="color: var(--color-primary);"></i>
            Predicción de próximo celo
          </h3>
        </div>
        <div class="card-body">
          <p class="mb-3 small" style="color: var(--color-text-secondary);">
            {{ prediction.message }}
          </p>

          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="text-center p-3 rounded" style="background-color: var(--color-muted);">
                <div class="fs-5 fw-bold" style="color: var(--color-primary);">{{ prediction.nextDate }}</div>
                <small style="color: var(--color-text-secondary);">Próximo celo estimado</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-center p-3 rounded" style="background-color: var(--color-warning-bg);">
                <div class="fs-5 fw-bold" style="color: var(--color-warning);">
                  {{ prediction.rangeStart }} — {{ prediction.rangeEnd }}
                </div>
                <small style="color: var(--color-text-secondary);">Ventana probable</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-center p-3 rounded" style="background-color: var(--color-muted);">
                <div class="fs-5 fw-bold" style="color: var(--color-text-primary);">
                  {{ prediction.averageInterval || prediction.defaultInterval || '—' }}
                </div>
                <small style="color: var(--color-text-secondary);">Intervalo (días)</small>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-center p-3 rounded" style="background-color: var(--color-muted);">
                <div class="fs-5 fw-bold" style="color: var(--color-text-primary);">
                  {{ prediction.stdDev !== undefined ? prediction.stdDev + ' días' : '—' }}
                </div>
                <small style="color: var(--color-text-secondary);">Desviación típica</small>
              </div>
            </div>
          </div>

          <div v-if="prediction.intervals && prediction.intervals.length" class="mb-3">
            <h4 class="h6 mb-2" style="color: var(--color-text-primary);">Intervalos entre celos</h4>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Días</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(interval, i) in prediction.intervals" :key="i">
                    <td>{{ interval.from }}</td>
                    <td>{{ interval.to }}</td>
                    <td class="fw-semibold">{{ interval.days }} días</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="prediction.type === 'estimated'" class="alert alert-info mb-0 mt-3">
            <i class="bi bi-info-circle me-1"></i>
            Con solo un celo registrado, la predicción usa el intervalo promedio estimado de 7 meses (210 días).
            Registra más celos para obtener una predicción más precisa.
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-5" style="color: var(--color-text-muted);">
      <i class="bi bi-heart" style="font-size: 3rem;"></i>
      <p class="mt-3">Selecciona una mascota para gestionar sus celos</p>
    </div>
  </div>
</template>
