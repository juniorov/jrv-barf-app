<script setup>
import { onMounted, ref, computed } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import api from '../api/client.js';
import { useToastStore } from '../stores/toast.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

const toast = useToastStore();

const pets = ref([]);
const selectedPetId = ref('');
const records = ref([]);
const loading = ref(false);
const newDate = ref('');
const newWeight = ref('');
const newChestGirth = ref('');
const newRearGirth = ref('');
const newNotes = ref('');
const showForm = ref(false);

const selectedPet = computed(() => {
  return pets.value.find(p => p._id === selectedPetId.value);
});

const todayISODate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const recordsDesc = computed(() => {
  return [...records.value].sort((a, b) => new Date(b.date) - new Date(a.date));
});

const last6MonthsRecords = computed(() => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  return records.value
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

const latestWeight = computed(() => {
  return recordsDesc.value.length ? recordsDesc.value[0].weight : null;
});

const weightChange = computed(() => {
  const chartRecords = last6MonthsRecords.value;
  if (chartRecords.length < 2) return null;
  const first = chartRecords[0].weight;
  const last = chartRecords[chartRecords.length - 1].weight;
  return Math.round((last - first) * 100) / 100;
});

const chartData = computed(() => ({
  labels: last6MonthsRecords.value.map(r => formatDisplayDate(r.date)),
  datasets: [
    {
      label: 'Peso (kg)',
      data: last6MonthsRecords.value.map(r => r.weight),
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      pointBackgroundColor: '#10B981',
      pointRadius: 4,
      tension: 0.3,
      fill: true,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.parsed.y} kg`,
      },
    },
  },
  scales: {
    y: {
      title: { display: true, text: 'kg' },
      beginAtZero: false,
    },
  },
};

const loadPets = async () => {
  try {
    pets.value = await api.get('/pets');
  } catch (e) {
    toast.error(e.message || 'No se pudieron cargar las mascotas');
  }
};

const loadRecords = async () => {
  if (!selectedPetId.value) return;
  loading.value = true;
  try {
    const data = await api.get(`/weights/${selectedPetId.value}`);
    records.value = data.records || [];
  } catch (e) {
    toast.error(e.message || 'No se pudieron cargar los registros de peso');
  } finally {
    loading.value = false;
  }
};

const onPetChange = async () => {
  newDate.value = todayISODate();
  newWeight.value = '';
  newChestGirth.value = '';
  newRearGirth.value = '';
  newNotes.value = '';
  showForm.value = false;
  records.value = [];
  if (selectedPetId.value) {
    await loadRecords();
  }
};

const toggleForm = () => {
  showForm.value = !showForm.value;
  if (showForm.value && !newDate.value) {
    newDate.value = todayISODate();
  }
};

const addRecord = async () => {
  if (!newDate.value) {
    toast.error('Selecciona una fecha');
    return;
  }
  const weightValue = Number(newWeight.value);
  if (!newWeight.value || isNaN(weightValue) || weightValue <= 0) {
    toast.error('Ingresa un peso válido');
    return;
  }
  if (newChestGirth.value && (isNaN(Number(newChestGirth.value)) || Number(newChestGirth.value) <= 0)) {
    toast.error('Ingresa una medida de parte torácica (PT) válida');
    return;
  }
  if (newRearGirth.value && (isNaN(Number(newRearGirth.value)) || Number(newRearGirth.value) <= 0)) {
    toast.error('Ingresa una medida de parte posterior (PP) válida');
    return;
  }
  if (!selectedPetId.value) return;

  try {
    await api.post(`/weights/${selectedPetId.value}`, {
      date: newDate.value,
      weight: weightValue,
      chestGirth: newChestGirth.value ? Number(newChestGirth.value) : undefined,
      rearGirth: newRearGirth.value ? Number(newRearGirth.value) : undefined,
      notes: newNotes.value,
    });
    toast.success('Peso registrado correctamente');
    newDate.value = todayISODate();
    newWeight.value = '';
    newChestGirth.value = '';
    newRearGirth.value = '';
    newNotes.value = '';
    showForm.value = false;
    await loadRecords();
  } catch (e) {
    toast.error(e.message || 'No se pudo registrar el peso');
  }
};

const deleteRecord = async (id) => {
  if (!confirm('¿Eliminar este registro de peso?')) return;
  try {
    await api.delete(`/weights/${id}`);
    toast.success('Registro eliminado');
    await loadRecords();
  } catch (e) {
    toast.error(e.message || 'No se pudo eliminar el registro');
  }
};

onMounted(() => {
  loadPets();
});
</script>

<template>
  <div class="fade-in">
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Registro de Peso</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Lleva un historial del peso de tu mascota y visualiza su evolución
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
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4">
          <div class="text-center p-3 rounded h-100" style="background-color: var(--color-muted);">
            <div class="fs-5 fw-bold" style="color: var(--color-primary);">
              {{ latestWeight !== null ? `${latestWeight} kg` : '—' }}
            </div>
            <small style="color: var(--color-text-secondary);">Peso actual</small>
          </div>
        </div>
        <div class="col-6 col-md-4">
          <div class="text-center p-3 rounded h-100" style="background-color: var(--color-muted);">
            <div class="fs-5 fw-bold" style="color: var(--color-text-primary);">
              {{ weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '—' }}
            </div>
            <small style="color: var(--color-text-secondary);">Variación (6 meses)</small>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="text-center p-3 rounded h-100" style="background-color: var(--color-muted);">
            <div class="fs-5 fw-bold" style="color: var(--color-text-primary);">
              {{ last6MonthsRecords.length }}
            </div>
            <small style="color: var(--color-text-secondary);">Registros (6 meses)</small>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <h3 class="h6 mb-0">
            <i class="bi bi-graph-up-arrow me-2" style="color: var(--color-primary);"></i>
            Evolución del peso (últimos 6 meses)
          </h3>
        </div>
        <div class="card-body">
          <div v-if="!last6MonthsRecords.length" class="text-center py-4">
            <i class="bi bi-bar-chart-line mb-2" style="font-size: 2rem; color: var(--color-text-muted);"></i>
            <p class="mb-0" style="color: var(--color-text-secondary);">
              No hay registros en los últimos 6 meses
            </p>
          </div>
          <div v-else style="height: 280px;">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="h6 mb-0">
            <i class="bi bi-clipboard2-data me-2" style="color: var(--color-primary);"></i>
            Historial de peso
            <span v-if="records.length" class="badge ms-2" style="background-color: var(--color-primary);">
              {{ records.length }}
            </span>
          </h3>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="toggleForm"
          >
            <i class="bi bi-plus-circle me-1"></i>
            {{ showForm ? 'Cancelar' : 'Nuevo registro' }}
          </button>
        </div>

        <div v-if="showForm" class="card-body" style="border-bottom: 1px solid var(--color-border);">
          <form @submit.prevent="addRecord">
            <div class="row g-3">
              <div class="col-12 col-md-4">
                <label class="form-label">Fecha *</label>
                <input
                  v-model="newDate"
                  type="date"
                  class="form-control"
                  required
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Peso (kg) *</label>
                <input
                  v-model="newWeight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  class="form-control"
                  placeholder="Ej: 12.5"
                  required
                />
              </div>
              <div class="col-6 col-md-2">
                <label class="form-label" title="Parte Torácica">PT (cm)</label>
                <input
                  v-model="newChestGirth"
                  type="number"
                  step="0.1"
                  min="0.1"
                  class="form-control"
                  placeholder="Opcional"
                />
              </div>
              <div class="col-6 col-md-2">
                <label class="form-label" title="Parte Posterior">PP (cm)</label>
                <input
                  v-model="newRearGirth"
                  type="number"
                  step="0.1"
                  min="0.1"
                  class="form-control"
                  placeholder="Opcional"
                />
              </div>
              <div class="col-12">
                <label class="form-label">Notas (opcional)</label>
                <input
                  v-model="newNotes"
                  type="text"
                  class="form-control"
                  placeholder="Ej: Después de la visita al veterinario"
                />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check-circle me-1"></i>
                  Registrar peso
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>Cargando...
          </div>
          <div v-else-if="!recordsDesc.length" class="text-center py-4">
            <i class="bi bi-inbox mb-2" style="font-size: 2rem; color: var(--color-text-muted);"></i>
            <p class="mb-0" style="color: var(--color-text-secondary);">
              No hay pesos registrados para {{ selectedPet?.name }}
            </p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso</th>
                  <th title="Parte Torácica">PT</th>
                  <th title="Parte Posterior">PP</th>
                  <th>Notas</th>
                  <th style="width: 80px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in recordsDesc" :key="record._id">
                  <td class="fw-semibold">{{ formatDisplayDate(record.date) }}</td>
                  <td>{{ record.weight }} kg</td>
                  <td>{{ record.chestGirth != null ? `${record.chestGirth} cm` : '—' }}</td>
                  <td>{{ record.rearGirth != null ? `${record.rearGirth} cm` : '—' }}</td>
                  <td style="color: var(--color-text-secondary);">{{ record.notes || '—' }}</td>
                  <td>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      @click="deleteRecord(record._id)"
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
    </template>

    <div v-else class="text-center py-5" style="color: var(--color-text-muted);">
      <i class="bi bi-speedometer2" style="font-size: 3rem;"></i>
      <p class="mt-3">Selecciona una mascota para registrar su peso</p>
    </div>
  </div>
</template>
