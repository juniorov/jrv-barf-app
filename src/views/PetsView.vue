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
            <label class="form-label">Fecha de Nacimiento</label>
            <input
              v-model="form.birthDate"
              type="date"
              class="form-control"
              required
            />
            <small v-if="form.birthDate" class="text-muted">
              Edad: {{ calculatedAge.toFixed(1) }} años
            </small>
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
        <div v-else>
          <!-- Vista de tabla para desktop -->
          <div class="table-responsive d-none d-md-block">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Comidas/día</th>
                  <th>Máx. ingredientes</th>
                  <th>Inventario Total</th>
                  <th>Días de comida</th>
                  <th>Ingredientes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pet in pets" :key="pet._id">
                  <td>{{ pet.name }}</td>
                  <td>{{ getPetAge(pet).toFixed(1) }} años</td>
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
                    <div class="d-flex align-items-center gap-2">
                      <div>
                        <small class="text-muted">
                          {{ pet.ingredients?.length || 0 }} ingrediente{{ (pet.ingredients?.length || 0) !== 1 ? 's' : '' }}
                        </small>
                        <div v-if="pet.ingredients?.length" class="small text-success">
                          {{ pet.ingredients.map(i => i.ingredient?.name || 'N/A').join(', ') }}
                        </div>
                      </div>
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

          <!-- Vista de cards para móvil -->
          <div class="d-md-none">
            <div v-for="pet in pets" :key="pet._id" class="pet-card mb-3">
              <div class="card">
                <div class="card-header">
                  <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                      <i class="bi bi-heart-fill text-danger me-2"></i>
                      {{ pet.name }}
                    </h5>
                    <span class="badge bg-primary">{{ getPetAge(pet).toFixed(1) }} años</span>
                  </div>
                </div>
                <div class="card-body">
                  <!-- Información básica -->
                  <div class="row mb-3">
                    <div class="col-6">
                      <small class="text-muted">Comidas diarias</small>
                      <div class="fw-bold">{{ pet.mealsPerDay ?? 0 }}</div>
                    </div>
                    <div class="col-6">
                      <small class="text-muted">Máx. ingredientes</small>
                      <div class="fw-bold">{{ pet.maxIngredientsPerBag ?? 5 }}</div>
                    </div>
                  </div>

                  <!-- Inventario -->
                  <div class="mb-3">
                    <small class="text-muted">Inventario</small>
                    <div v-if="editingInventory === pet._id" class="d-flex align-items-center gap-2 mt-1">
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        v-model.number="tempInventory"
                        min="0"
                        @keyup.enter="updateInventory(pet)"
                        @keyup.escape="cancelEditInventory"
                        placeholder="Cantidad de bolsas"
                      >
                      <button
                        type="button"
                        class="btn btn-success btn-sm"
                        @click="updateInventory(pet)"
                        title="Guardar"
                      >
                        <i class="bi bi-check"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        @click="cancelEditInventory"
                        title="Cancelar"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                    <div v-else class="d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-bold">{{ pet.totalInventory ?? 0 }} bolsas</div>
                        <small v-if="getDaysOfFood(pet) !== null" class="text-success">
                          <i class="bi bi-calendar-check me-1"></i>{{ getDaysOfFood(pet).toFixed(1) }} días
                        </small>
                        <small v-else class="text-muted">Sin estimación de días</small>
                      </div>
                      <button
                        type="button"
                        class="btn btn-outline-primary btn-sm"
                        @click="startEditInventory(pet)"
                      >
                        <i class="bi bi-pencil me-1"></i>Editar
                      </button>
                    </div>
                  </div>

                  <!-- Ingredientes -->
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <small class="text-muted">
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
                    <div v-if="pet.ingredients?.length" class="ingredient-tags">
                      <span
                        v-for="ing in pet.ingredients"
                        :key="ing.ingredient?._id"
                        class="badge bg-light text-dark me-1 mb-1"
                      >
                        {{ ing.ingredient?.name || 'N/A' }}
                      </span>
                    </div>
                    <div v-else class="text-muted small">Sin ingredientes asignados</div>
                  </div>

                  <!-- Acciones -->
                  <div class="d-grid gap-2">
                    <div class="row">
                      <div class="col-6">
                        <button
                          type="button"
                          class="btn btn-outline-secondary btn-sm w-100"
                          @click="editPet(pet)"
                        >
                          <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                      </div>
                      <div class="col-6">
                        <button
                          type="button"
                          class="btn btn-outline-primary btn-sm w-100"
                          :disabled="feedingLoading"
                          @click="registerFeedingDay(pet)"
                        >
                          <i class="bi bi-plus-circle me-1"></i>
                          <span v-if="feedingLoading">Registrando...</span>
                          <span v-else>Día comida</span>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      @click="deletePet(pet)"
                    >
                      <i class="bi bi-trash me-1"></i>Eliminar mascota
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para gestionar ingredientes de mascota -->
    <div v-if="managingIngredients" class="modal d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Gestionar ingredientes de la mascota</h5>
            <button type="button" class="btn-close" @click="cancelManageIngredients"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted ">Selecciona los ingredientes que forman parte de la dieta de esta mascota y define la cantidad en gramos por porción.</p>
            <div v-if="petIngredients.length === 0" class="text-muted">
              No hay ingredientes disponibles. Crea algunos ingredientes primero.
            </div>
            <div v-else>
              <div v-for="ing in petIngredients" :key="ing.ingredientId" class="row mb-3 align-items-center border-bottom pb-2">
                <div class="col-md-1">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    v-model="ing.selected"
                  >
                </div>
                <div class="col-md-5">
                  <strong>{{ ing.name }}</strong>
                </div>
                <div class="col-md-6">
                  <div class="input-group input-group-sm">
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="ing.gramsPerPortion"
                      min="1"
                      :disabled="!ing.selected"
                      placeholder="Gramos por porción"
                    >
                    <span class="input-group-text">g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelManageIngredients">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" @click="savePetIngredients">
              Guardar ingredientes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos para cards de mascotas en móvil */
.pet-card .card {
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s ease;
}

.pet-card .card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.pet-card .card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 0.75rem 1rem;
}

.pet-card .card-body {
  padding: 1rem;
}

.ingredient-tags {
  max-height: 60px;
  overflow-y: auto;
}

.ingredient-tags .badge {
  font-size: 0.75rem;
  border: 1px solid #dee2e6;
}

/* Mejoras para inputs en mobile */
@media (max-width: 767.98px) {
  .pet-card .form-control-sm {
    font-size: 0.875rem;
  }

  .pet-card .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  /* Espaciado optimizado para mobile */
  .pet-card .row {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
  }

  .pet-card .row > * {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

/* Indicadores de estado mejorados */
.pet-card .text-success {
  color: #198754 !important;
}

.pet-card .badge.bg-primary {
  background-color: #0d6efd !important;
}

.pet-card .badge.bg-light {
  background-color: #e9ecef !important;
  color: #495057 !important;
}

/* Animaciones sutiles */
.pet-card .btn {
  transition: all 0.2s ease;
}

.pet-card .btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* Mejora de accesibilidad en mobile */
@media (max-width: 575.98px) {
  .pet-card .card-body {
    padding: 0.75rem;
  }

  .pet-card .btn {
    padding: 0.375rem 0.75rem;
  }

  .pet-card h5 {
    font-size: 1.1rem;
  }
}
</style>
