<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';

const pets = ref([]);
const ingredients = ref([]);
const loading = ref(false);
const saving = ref(false);
const feedingLoading = ref(false);
const editingInventory = ref(null);
const tempInventory = ref(0);
const managingIngredients = ref(null);
const petIngredients = ref([]);
const error = ref('');
const success = ref('');

const form = ref({
  id: null,
  name: '',
  birthDate: '',
  mealsPerDay: 1,
  maxIngredientsPerBag: 5,
  feedingTimesText: '',
});

// Calcular edad basada en fecha de nacimiento
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

// Calcular edad humana equivalente (fórmula aproximada)
// Calcular edad real del perro a partir de la edad humana
// Fórmula actualizada: 1 año = 15 humanos, 2 años = 24, luego +4 por año adicional
const calculateRealAge = (humanAge) => {
  if (!humanAge || humanAge <= 0) return 0;
  
  if (humanAge <= 15) return humanAge / 15;
  if (humanAge <= 24) return 2;
  return 2 + (humanAge - 24) / 4;
};

// Edad calculada reactivamente
const calculatedAge = computed(() => {
  return form.value.birthDate ? calculateAge(form.value.birthDate) : 0;
});

// Función para obtener la edad de una mascota (para mostrar en lista)
const getPetAge = (pet) => {
  if (pet.birthDate) {
    return calculateAge(pet.birthDate);
  }
  return pet.age || 0;
};

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    birthDate: '',
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

const loadIngredients = async () => {
  try {
    ingredients.value = await api.get('/ingredients');
  } catch (e) {
    console.error('No se pudieron cargar los ingredientes:', e);
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
    if (!form.value.name || !form.value.birthDate) {
      error.value = 'Nombre y fecha de nacimiento son obligatorios';
      return;
    }

    const calculatedAgeValue = calculateAge(form.value.birthDate);

    const payload = {
      name: form.value.name,
      birthDate: form.value.birthDate, // Enviar como string ISO
      age: Number(calculatedAgeValue.toFixed(1)), // Calcular y enviar edad
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
  // Si la mascota tiene birthDate, usarla; si no, calcular una fecha aproximada desde la edad
  let birthDateValue = '';
  if (pet.birthDate) {
    birthDateValue = new Date(pet.birthDate).toISOString().split('T')[0];
  } else if (pet.age) {
    // Aproximar fecha de nacimiento basada en la edad actual
    const approximateBirthDate = new Date();
    approximateBirthDate.setFullYear(approximateBirthDate.getFullYear() - Math.floor(pet.age));
    approximateBirthDate.setMonth(approximateBirthDate.getMonth() - Math.round((pet.age % 1) * 12));
    birthDateValue = approximateBirthDate.toISOString().split('T')[0];
  }

  form.value = {
    id: pet._id,
    name: pet.name,
    birthDate: birthDateValue,
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
    success.value = `✅ Se registró un día de comida para ${pet.name}. Inventario restante: ${res.remainingInventory} bolsas. El rebajo automático no se ejecutará hasta mañana.`;

    // Debug: mostrar información de la actualización
    console.log('🍽️ Registro de comida completado:', {
      pet: pet.name,
      remainingInventory: res.remainingInventory,
      lastUpdate: res.lastInventoryUpdate,
      timezone: res.timezone
    });

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

const startManageIngredients = async (pet) => {
  try {
    managingIngredients.value = pet._id;
    const existingIngredients = await api.get(`/pets/${pet._id}/ingredients`);
    console.log('Ingredientes existentes para', pet.name, ':', existingIngredients);

    // Crear array con todos los ingredientes y marcar cuáles están asociados
    petIngredients.value = ingredients.value.map(ing => {
      const existing = existingIngredients.find(ei => ei.ingredient._id === ing._id);
      return {
        ingredientId: ing._id,
        name: ing.name,
        selected: !!existing,
        gramsPerPortion: existing ? existing.gramsPerPortion : 100,
        desiredPortions: existing ? existing.desiredPortions || 0 : 0
      };
    });
    console.log('Ingredientes preparados para el modal:', petIngredients.value);
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar los ingredientes de la mascota';
  }
};

const savePetIngredients = async () => {
  try {
    const selectedIngredients = petIngredients.value
      .filter(pi => pi.selected)
      .map(pi => ({
        ingredient: pi.ingredientId,
        gramsPerPortion: pi.gramsPerPortion,
        desiredPortions: pi.desiredPortions || 0
      }));

    console.log('Guardando ingredientes para mascota:', managingIngredients.value);
    console.log('Ingredientes seleccionados:', selectedIngredients);

    const result = await api.put(`/pets/${managingIngredients.value}/ingredients`, {
      ingredients: selectedIngredients
    });

    console.log('Resultado del guardado:', result);

    success.value = 'Ingredientes de la mascota actualizados correctamente';
    managingIngredients.value = null;
    error.value = '';

    // Recargar mascotas para mostrar los cambios actualizados
    await loadPets();
  } catch (e) {
    console.error('Error guardando ingredientes:', e);
    error.value = e.message || 'No se pudieron guardar los ingredientes';
  }
};

const cancelManageIngredients = () => {
  managingIngredients.value = null;
  petIngredients.value = [];
};

onMounted(() => {
  loadPets();
  loadIngredients();
});
</script>

<template>
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Mascotas</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Gestiona tus mascotas y su alimentación BARF
      </p>
    </div>

    <!-- Alerts -->
    <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>
    <div v-if="success" class="alert alert-success mb-3">{{ success }}</div>

    <!-- Form Card -->
    <div class="card mb-4">
      <div class="card-header">
        <h3 class="h6 mb-0" style="color: var(--color-text-primary);">
          <i class="bi bi-plus-circle me-2" style="color: var(--color-primary);"></i>
          {{ form.id ? 'Editar mascota' : 'Nueva mascota' }}
        </h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="onSubmit">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Nombre *</label>
              <input
                v-model="form.name"
                type="text"
                class="form-control"
                required
                placeholder="Ej: Rocky"
              />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Fecha de Nacimiento *</label>
              <input
                v-model="form.birthDate"
                type="date"
                class="form-control"
                required
              />
              <small v-if="form.birthDate" style="color: var(--color-text-secondary);">
                Edad: {{ calculatedAge.toFixed(1) }} años
              </small>
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label">Comidas al día</label>
              <input
                v-model.number="form.mealsPerDay"
                type="number"
                min="0"
                step="1"
                class="form-control"
                required
              />
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label">Máx. ingredientes</label>
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
            <div class="col-12">
              <label class="form-label">Horarios de comida</label>
              <input
                v-model="form.feedingTimesText"
                type="text"
                class="form-control"
                placeholder="Ej: 08:00, 14:00, 20:00"
              />
              <small style="color: var(--color-text-secondary);">
                Separados por coma (HH:MM)
              </small>
            </div>
            <div class="col-12">
              <button type="submit" class="btn btn-primary w-100" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
                {{ form.id ? 'Guardar Cambios' : 'Añadir Mascota' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Pets List -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h3 class="h6 mb-0">Listado de Mascotas</h3>
        <span v-if="loading" class="small" style="color: var(--color-text-secondary);">
          <span class="spinner-border spinner-border-sm me-1"></span>Cargando...
        </span>
      </div>
      <div class="card-body p-0">
        <div v-if="!pets.length && !loading" class="text-center py-5">
          <i class="bi bi-inbox mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
          <p class="mb-0" style="color: var(--color-text-secondary);">
            No hay mascotas aún. Crea la primera con el formulario.
          </p>
        </div>
        
        <!-- Mobile Cards View -->
        <div v-else class="d-md-none">
          <div v-for="pet in pets" :key="pet._id" class="pet-card">
            <div class="card m-3">
              <!-- Pet Header -->
              <div class="card-header" style="background-color: var(--color-muted);">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0 d-flex align-items-center">
                    <i class="bi bi-heart-fill me-2" style="color: var(--color-primary);"></i>
                    {{ pet.name }}
                  </h5>
                  <span class="badge" style="background-color: var(--color-primary); color: white;">
                    {{ getPetAge(pet).toFixed(1) }} años
                  </span>
                </div>
              </div>
              
              <!-- Pet Info -->
              <div class="card-body">
                <!-- Stats Grid -->
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <div class="text-center p-3 rounded" style="background-color: var(--color-muted);">
                      <div class="fw-bold fs-4" style="color: var(--color-text-primary);">{{ pet.mealsPerDay ?? 0 }}</div>
                      <small style="color: var(--color-text-secondary);">Comidas/día</small>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center p-3 rounded" style="background-color: var(--color-muted);">
                      <div class="fw-bold fs-4" style="color: var(--color-text-primary);">{{ pet.maxIngredientsPerBag ?? 5 }}</div>
                      <small style="color: var(--color-text-secondary);">Máx. ingredientes</small>
                    </div>
                  </div>
                </div>

                <!-- Inventory -->
                <div class="mb-3 p-3 rounded" style="background-color: var(--color-success-bg);">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <small style="color: var(--color-text-secondary);">Inventario</small>
                    <span class="fw-bold fs-5" style="color: var(--color-success);">
                      {{ pet.totalInventory ?? 0 }} bolsas
                    </span>
                  </div>
                  <div v-if="getDaysOfFood(pet) !== null" class="d-flex justify-content-between align-items-center">
                    <small style="color: var(--color-text-secondary);">Días restantes</small>
                    <span class="fw-bold" style="color: var(--color-success);">
                      {{ getDaysOfFood(pet).toFixed(1) }} días
                    </span>
                  </div>
                  <div v-if="editingInventory === pet._id" class="mt-3 pt-3" style="border-top: 1px solid var(--color-border);">
                    <div class="d-flex gap-2">
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="tempInventory"
                        min="0"
                        @keyup.enter="updateInventory(pet)"
                        @keyup.escape="cancelEditInventory"
                        placeholder="Cantidad"
                      >
                      <button
                        type="button"
                        class="btn btn-success"
                        @click="updateInventory(pet)"
                        aria-label="Guardar"
                      >
                        <i class="bi bi-check"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        @click="cancelEditInventory"
                        aria-label="Cancelar"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="mt-2">
                    <button
                      type="button"
                      class="btn btn-outline-primary btn-sm w-100"
                      @click="startEditInventory(pet)"
                    >
                      <i class="bi bi-pencil me-1"></i>Editar Inventario
                    </button>
                  </div>
                </div>

                <!-- Ingredients -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <small style="color: var(--color-text-secondary);">
                      Ingredientes ({{ pet.ingredients?.length || 0 }})
                    </small>
                    <button
                      type="button"
                      class="btn btn-outline-info btn-sm"
                      @click="startManageIngredients(pet)"
                    >
                      <i class="bi bi-gear me-1"></i>Gestionar
                    </button>
                  </div>
                  <div v-if="pet.ingredients?.length" class="d-flex flex-wrap gap-2">
                    <span
                      v-for="ing in pet.ingredients"
                      :key="ing.ingredient?._id"
                      class="badge"
                      style="background-color: var(--color-muted); color: var(--color-text-primary); border: 1px solid var(--color-border);"
                    >
                      {{ ing.ingredient?.name || 'N/A' }}
                    </span>
                  </div>
                  <div v-else style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                    Sin ingredientes asignados
                  </div>
                </div>

                <!-- Actions -->
                <div class="d-grid gap-2">
                  <div class="row g-2">
                    <div class="col-6">
                      <button
                        type="button"
                        class="btn btn-outline-secondary w-100"
                        @click="editPet(pet)"
                      >
                        <i class="bi bi-pencil me-1"></i>Editar
                      </button>
                    </div>
                    <div class="col-6">
                      <button
                        type="button"
                        class="btn btn-outline-primary w-100"
                        :disabled="feedingLoading"
                        @click="registerFeedingDay(pet)"
                      >
                        <i class="bi bi-plus-circle me-1"></i>
                        <span v-if="feedingLoading">Registrando...</span>
                        <span v-else>Día Comida</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn btn-outline-danger"
                    @click="deletePet(pet)"
                  >
                    <i class="bi bi-trash me-1"></i>Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="d-none d-md-block">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Comidas/día</th>
                  <th>Máx. ingredientes</th>
                  <th>Inventario</th>
                  <th>Días restantes</th>
                  <th>Ingredientes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pet in pets" :key="pet._id">
                  <td class="fw-semibold">{{ pet.name }}</td>
                  <td>{{ getPetAge(pet).toFixed(1) }} años</td>
                  <td>{{ pet.mealsPerDay ?? 0 }}</td>
                  <td>{{ pet.maxIngredientsPerBag ?? 5 }}</td>
                  <td>
                    <div v-if="editingInventory === pet._id" class="d-flex align-items-center gap-2">
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        style="width: 100px;"
                        v-model.number="tempInventory"
                        min="0"
                        @keyup.enter="updateInventory(pet)"
                        @keyup.escape="cancelEditInventory"
                      >
                      <button
                        type="button"
                        class="btn btn-success btn-sm"
                        @click="updateInventory(pet)"
                        aria-label="Guardar"
                      >
                        <i class="bi bi-check"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        @click="cancelEditInventory"
                        aria-label="Cancelar"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                    <div v-else class="d-flex align-items-center gap-2">
                      <span class="fw-semibold">{{ pet.totalInventory ?? 0 }}</span>
                      <button
                        type="button"
                        class="btn btn-outline-primary btn-sm"
                        @click="startEditInventory(pet)"
                        aria-label="Editar inventario"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                    </div>
                  </td>
                  <td>
                    <span v-if="getDaysOfFood(pet) !== null" class="fw-semibold" style="color: var(--color-success);">
                      {{ getDaysOfFood(pet).toFixed(1) }} días
                    </span>
                    <span v-else style="color: var(--color-text-muted);">—</span>
                  </td>
                  <td>
                    <div class="d-flex flex-wrap gap-1 align-items-center">
                      <span style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        {{ pet.ingredients?.length || 0 }}
                      </span>
                      <button
                        type="button"
                        class="btn btn-outline-info btn-sm"
                        @click="startManageIngredients(pet)"
                      >
                        Gestionar
                      </button>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex gap-2">
                      <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        @click="editPet(pet)"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-primary btn-sm"
                        :disabled="feedingLoading"
                        @click="registerFeedingDay(pet)"
                      >
                        Registrar día
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        @click="deletePet(pet)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Ingredients Modal -->
    <div v-if="managingIngredients" class="modal d-block" style="background: rgba(0,0,0,0.5); z-index: var(--z-modal);">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-grid me-2" style="color: var(--color-primary);"></i>
              Gestionar Ingredientes
            </h5>
            <button type="button" class="btn-close" @click="cancelManageIngredients" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Selecciona los ingredientes y define los gramos por porción
            </p>
            <div v-if="petIngredients.length === 0" style="color: var(--color-text-muted);">
              No hay ingredientes disponibles
            </div>
            <div v-else>
              <div v-for="ing in petIngredients" :key="ing.ingredientId" class="mb-3 p-3 rounded" style="background-color: var(--color-muted);">
                <div class="row align-items-center g-3">
                  <div class="col-auto">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      v-model="ing.selected"
                      style="width: 20px; height: 20px;"
                    >
                  </div>
                  <div class="col">
                    <strong>{{ ing.name }}</strong>
                  </div>
                  <div class="col-auto">
                    <div class="input-group">
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="ing.gramsPerPortion"
                        min="1"
                        :disabled="!ing.selected"
                        placeholder="Gramos"
                        style="min-width: 100px;"
                      >
                      <span class="input-group-text">g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="cancelManageIngredients">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" @click="savePetIngredients">
              <i class="bi bi-check-circle me-1"></i>
              Guardar Ingredientes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet-card .card {
  transition: box-shadow var(--transition-base);
}

.pet-card .card:hover {
  box-shadow: var(--shadow-md);
}

@media (prefers-reduced-motion: reduce) {
  .pet-card .card {
    transition: none;
  }
}

.modal {
  backdrop-filter: blur(4px);
}

.modal-content {
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
