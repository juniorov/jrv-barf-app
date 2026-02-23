<script setup>
import { onMounted, ref } from 'vue';
import api from '../api/client.js';

const pets = ref([]);
const loading = ref(false);
const saving = ref(false);
const feedingLoading = ref(false);
const editingInventory = ref(null);
const tempInventory = ref(0);
const error = ref('');
const success = ref('');

const form = ref({
  id: null,
  name: '',
  age: 0,
  mealsPerDay: 1,
  maxIngredientsPerBag: 5,
  feedingTimesText: '',
});

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    age: 0,
    mealsPerDay: 1,
    maxIngredientsPerBag: 5,
    feedingTimesText: '',
  };
};

const loadPets = async () => {
  loading.value = true;
  error.value = '';
  try {
    pets.value = await api.get('/pets');
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar las mascotas';
  } finally {
    loading.value = false;
  }
};

const getDaysOfFood = (pet) => {
  const inventory = pet.totalInventory || 0;
  if (!pet.mealsPerDay || pet.mealsPerDay <= 0) return null;
  return inventory / pet.mealsPerDay;
};

const startEditInventory = (pet) => {
  editingInventory.value = pet._id;
  tempInventory.value = pet.totalInventory || 0;
};

const updateInventory = async (pet) => {
  try {
    const updated = await api.put(`/pets/${pet._id}`, {
      ...pet,
      totalInventory: Number(tempInventory.value)
    });
    pets.value = pets.value.map((p) => (p._id === updated._id ? updated : p));
    success.value = `Inventario de ${pet.name} actualizado a ${tempInventory.value} bolsas`;
    editingInventory.value = null;
    error.value = '';
  } catch (e) {
    error.value = e.message || 'No se pudo actualizar el inventario';
  }
};

const cancelEditInventory = () => {
  editingInventory.value = null;
  tempInventory.value = 0;
};

const onSubmit = async () => {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    if (!form.value.name || form.value.age === null || form.value.age === undefined) {
      error.value = 'Nombre y edad son obligatorios';
      return;
    }
    const payload = {
      name: form.value.name,
      age: Number(form.value.age),
      mealsPerDay: Number(form.value.mealsPerDay || 0),
      maxIngredientsPerBag: Number(form.value.maxIngredientsPerBag || 5),
      feedingTimes: form.value.feedingTimesText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
    };
    if (form.value.id) {
      const updated = await api.put(`/pets/${form.value.id}`, payload);
      pets.value = pets.value.map((p) => (p._id === updated._id ? updated : p));
      success.value = 'Mascota actualizada correctamente';
    } else {
      const created = await api.post('/pets', payload);
      pets.value.unshift(created);
      success.value = 'Mascota creada correctamente';
    }
    resetForm();
  } catch (e) {
    error.value = e.message || 'No se pudo guardar la mascota';
  } finally {
    saving.value = false;
  }
};

const editPet = (pet) => {
  form.value = {
    id: pet._id,
    name: pet.name,
    age: pet.age,
    mealsPerDay: pet.mealsPerDay ?? 1,
    maxIngredientsPerBag: pet.maxIngredientsPerBag ?? 5,
    feedingTimesText: Array.isArray(pet.feedingTimes)
      ? pet.feedingTimes.join(', ')
      : '',
  };
  success.value = '';
  error.value = '';
};

const registerFeedingDay = async (pet) => {
  error.value = '';
  success.value = '';
  feedingLoading.value = true;
  try {
    const res = await api.post(`/pets/${pet._id}/feed-day`, {});
    success.value = `Se registró un día de comida para ${pet.name}. Inventario restante: ${res.remainingInventory} bolsas`;
    await loadPets();
  } catch (e) {
    error.value = e.message || 'No se pudo registrar el día de comida';
  } finally {
    feedingLoading.value = false;
  }
};

const deletePet = async (pet) => {
  const confirmDelete = window.confirm(
    `¿Eliminar mascota "${pet.name}"?\nLas bolsas que la usen quedarán sin mascota asociada.`,
  );
  if (!confirmDelete) return;

  try {
    await api.delete(`/pets/${pet._id}`);
    pets.value = pets.value.filter((p) => p._id !== pet._id);
    success.value = 'Mascota eliminada';
    error.value = '';
  } catch (e) {
    error.value = e.message || 'No se pudo eliminar la mascota';
  }
};

onMounted(loadPets);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Mascotas</h2>
    </div>

    <p class="text-muted small mb-3">
      Gestiona tus mascotas (nombre y edad) para poder asociar las bolsas o platos de comida a cada
      una de ellas.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <div class="card mb-4">
      <div class="card-body">
        <h3 class="h6 mb-3">
          {{ form.id ? 'Editar mascota' : 'Nueva mascota' }}
        </h3>
        <form @submit.prevent="onSubmit" class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              class="form-control"
              required
              placeholder="Ej: Rocky"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">Edad (años, acepta decimales)</label>
            <input
              v-model.number="form.age"
              type="number"
              min="0"
              step="0.1"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">Comidas al día (bolsas)</label>
            <input
              v-model.number="form.mealsPerDay"
              type="number"
              min="0"
              step="1"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">Máx. ingredientes por bolsa</label>
            <input
              v-model.number="form.maxIngredientsPerBag"
              type="number"
              min="1"
              max="20"
              step="1"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-6">
            <label class="form-label">Horas de comida (HH:MM, separadas por coma)</label>
            <input
              v-model="form.feedingTimesText"
              type="text"
              class="form-control"
              placeholder="Ej: 08:00, 14:00, 20:00"
            />
            <small class="text-muted">
              Se usan para calcular automáticamente cuántas bolsas deberían haberse consumido desde
              la última actualización.
            </small>
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button type="submit" class="btn btn-primary w-100" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              {{ form.id ? 'Guardar' : 'Añadir' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h3 class="h6 mb-0">Listado de mascotas</h3>
          <span v-if="loading" class="small text-muted">Cargando...</span>
        </div>
        <div v-if="!pets.length && !loading" class="text-muted small">
          No hay mascotas aún. Crea la primera con el formulario superior.
        </div>
        <div class="table-responsive" v-else>
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Edad</th>
                <th>Comidas/día</th>
                <th>Máx. ingredientes</th>
                <th>Inventario Total</th>
                <th>Días de comida</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pet in pets" :key="pet._id">
                <td>{{ pet.name }}</td>
                <td>{{ pet.age }} años</td>
                <td>{{ pet.mealsPerDay ?? 0 }}</td>
                <td>{{ pet.maxIngredientsPerBag ?? 5 }}</td>
                <td>
                  <div v-if="editingInventory === pet._id" class="d-flex align-items-center gap-1">
                    <input 
                      type="number" 
                      class="form-control form-control-sm" 
                      style="width: 80px;"
                      v-model.number="tempInventory"
                      min="0"
                      @keyup.enter="updateInventory(pet)"
                      @keyup.escape="cancelEditInventory"
                    >
                    <button 
                      type="button" 
                      class="btn btn-outline-success btn-sm"
                      @click="updateInventory(pet)"
                      title="Guardar"
                    >
                      <i class="bi bi-check"></i>
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary btn-sm"
                      @click="cancelEditInventory"
                      title="Cancelar"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                  <div v-else class="d-flex align-items-center gap-2">
                    <span>{{ pet.totalInventory ?? 0 }} bolsas</span>
                    <button 
                      type="button" 
                      class="btn btn-outline-primary btn-sm"
                      @click="startEditInventory(pet)"
                      title="Editar inventario"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                  </div>
                </td>
                <td>
                  <span v-if="getDaysOfFood(pet) !== null">
                    {{ getDaysOfFood(pet).toFixed(1) }} días
                  </span>
                  <span v-else class="text-muted small">Sin comidas/día</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm me-2"
                    @click="editPet(pet)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm me-2"
                    :disabled="feedingLoading"
                    @click="registerFeedingDay(pet)"
                  >
                    Registrar día de comida
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    @click="deletePet(pet)"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

