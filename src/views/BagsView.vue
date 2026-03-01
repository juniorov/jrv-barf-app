<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();

const ingredients = ref([]);
const pets = ref([]);
const bags = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

const maxIngredientsPerBag = computed(() => {
  if (form.value.petId) {
    const selectedPet = pets.value.find(p => p._id === form.value.petId);
    return selectedPet?.maxIngredientsPerBag ?? 5;
  }
  // Valor por defecto cuando no hay mascota seleccionada
  return 5;
});

const form = ref({
  id: null,
  name: '',
  quantity: 1,
  petId: null,
  selections: [],
});

// Ingredientes disponibles basados en la mascota selecionada
const availableIngredients = computed(() => {
  if (!form.value.petId) return [];

  const selectedPet = pets.value.find(p => p._id === form.value.petId);
  const ingredients = selectedPet?.ingredients || [];
  console.log('Available ingredients for pet', selectedPet?.name, ':', ingredients);
  return ingredients;
});

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    quantity: 1,
    petId: null,
    selections: [],
  };
};

// Actualizar selections cuando cambia la mascota
const updateSelectionsForPet = () => {
  if (!form.value.petId) {
    form.value.selections = [];
    return;
  }

  const selectedPet = pets.value.find(p => p._id === form.value.petId);
  const petIngredients = selectedPet?.ingredients || [];
  console.log('Updating selections for pet:', selectedPet?.name, 'ingredients:', petIngredients);

  form.value.selections = petIngredients.map((i) => ({
    ingredientId: i.ingredient._id,
    selected: false,
    gramsPerBag: i.gramsPerPortion || 100,
  }));

  console.log('New selections:', form.value.selections);
};

const loadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [ing, bs, ps] = await Promise.all([
      api.get('/ingredients'),
      api.get('/bags'), // Obtener TODAS las bolsas
      api.get('/pets'),
    ]);
    ingredients.value = ing;
    pets.value = ps;

    bags.value = bs.filter((b) => !b.isCompleted);
    resetForm();
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar las bolsas o ingredientes';
  } finally {
    loading.value = false;
  }
};

const selectedCount = computed(
  () => form.value.selections.filter((s) => s.selected).length,
);

const onSubmit = async () => {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    if (!form.value.name || !form.value.quantity) {
      error.value = 'Nombre y cantidad son obligatorios';
      return;
    }

    if (!form.value.petId) {
      error.value = 'Debes seleccionar una mascota';
      return;
    }

    const selected = form.value.selections.filter((s) => s.selected);

    if (!selected.length) {
      error.value = 'Selecciona al menos un ingrediente';
      return;
    }

    if (selected.length > maxIngredientsPerBag.value) {
      error.value = `No puedes añadir más de ${maxIngredientsPerBag.value} ingredientes por bolsa.`;
      return;
    }

    const ingredientsPayload = selected.map((s) => ({
      ingredient: s.ingredientId,
      gramsPerBag: Number(s.gramsPerBag || 0),
    }));

    const payload = {
      name: form.value.name,
      quantity: Number(form.value.quantity),
      ingredients: ingredientsPayload,
      pet: form.value.petId || null,
    };

    if (form.value.id) {
      const updated = await api.put(`/bags/${form.value.id}`, payload);
      bags.value = bags.value.map((b) =>
        b._id === updated._id ? updated : b,
      );
      success.value = 'Bolsa actualizada correctamente';
    } else {
      const created = await api.post('/bags', payload);
      bags.value.unshift(created);
      success.value = 'Bolsa creada correctamente';
    }
    resetForm();
  } catch (e) {
    error.value = e.message || 'No se pudo guardar la bolsa';
  } finally {
    saving.value = false;
  }
};

const editBag = (bag) => {
  form.value.id = bag._id;
  form.value.name = bag.name;
  form.value.quantity = bag.quantity;
  form.value.petId = bag.pet?._id || null;

  // Obtener ingredientes de la mascota
  const selectedPet = pets.value.find(p => p._id === form.value.petId);
  const petIngredients = selectedPet?.ingredients || [];

  form.value.selections = petIngredients.map((i) => {
    const found = bag.ingredients.find(
      (bi) => bi.ingredient && bi.ingredient._id === i.ingredient._id,
    );
    return {
      ingredientId: i.ingredient._id,
      selected: !!found,
      gramsPerBag: found ? found.gramsPerBag : i.gramsPerPortion || 100,
    };
  });

  success.value = '';
  error.value = '';
};

const deleteBag = async (bag) => {
  const confirmDelete = window.confirm(
    `¿Eliminar bolsa "${bag.name}"? Esta acción no se puede deshacer.`,
  );
  if (!confirmDelete) return;

  try {
    await api.delete(`/bags/${bag._id}`);
    bags.value = bags.value.filter((b) => b._id !== bag._id);
    success.value = 'Bolsa eliminada';
    error.value = '';
  } catch (e) {
    error.value = e.message || 'No se pudo eliminar la bolsa';
  }
};

const completingBags = ref(new Set());

const completeBag = async (bag) => {
  if (!bag.pet) {
    error.value = 'La bolsa debe estar asociada a una mascota para completarla';
    return;
  }

  const confirmComplete = window.confirm(
    `¿Marcar ${bag.quantity} bolsas de "${bag.name}" como completadas? Se agregarán al inventario de ${bag.pet.name}.`,
  );
  if (!confirmComplete) return;

  // Agregar a la lista de bolsas procesándose
  completingBags.value.add(bag._id);
  error.value = '';
  success.value = '';

  try {
    const response = await api.post(`/bags/${bag._id}/complete`, {});

    // Remover la bolsa de la lista inmediatamente tras éxito
    bags.value = bags.value.filter((b) => b._id !== bag._id);

    success.value = `✅ ${response.message || 'Bolsa completada correctamente y removida de la lista'}`;

    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
      success.value = '';
    }, 3000);

  } catch (e) {
    error.value = e.message || 'No se pudo completar la bolsa';
    console.error('Error completando bolsa:', e);
  } finally {
    // Remover de la lista de procesamiento
    completingBags.value.delete(bag._id);
  }
};

onMounted(loadData);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Bolsas incompletas</h2>
      <div class="d-flex gap-2">
        <span v-if="form.petId" class="badge bg-success">
          <i class="bi bi-heart-fill me-1"></i>
          {{ pets.find(p => p._id === form.petId)?.name }}
          (Máx. {{ maxIngredientsPerBag }})
        </span>
      </div>
    </div>

    <p class="text-muted small mb-3">
      Define bolsas o platos indicando qué ingredientes llevan y en qué cantidad.
      <strong>Selecciona una mascota</strong> para aplicar sus configuraciones específicas.
      Márcalas como completadas para actualizar el inventario.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <!-- Formulario -->
    <div class="card mb-4">
      <div class="card-body">
        <h3 class="h6 mb-3">
          {{ form.id ? 'Editar bolsa incompleta' : 'Nueva bolsa incompleta' }}
        </h3>
        <form @submit.prevent="onSubmit" class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Nombre de la bolsa</label>
            <input
              v-model="form.name"
              type="text"
              class="form-control"
              required
              placeholder="Ej: Bolsa de pollo y ternera"
            />
          </div>
          <div class="col-md-2">
            <label class="form-label">Cantidad de bolsas</label>
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">Mascota</label>
            <select v-model="form.petId" class="form-select" @change="updateSelectionsForPet">
              <option :value="null">Sin mascota asociada</option>
              <option v-for="pet in pets" :key="pet._id" :value="pet._id">
                {{ pet.name }}
              </option>
            </select>
          </div>
          <div class="col-md-12">
            <label class="form-label d-flex justify-content-between">
              <span>Ingredientes de la bolsa</span>
              <span class="small text-muted">
                Seleccionados: {{ selectedCount }} / {{ maxIngredientsPerBag }}
              </span>
            </label>
            <div v-if="!form.petId" class="alert alert-info py-2 small">
              Selecciona una mascota para ver sus ingredientes disponibles.
            </div>
            <div v-else-if="availableIngredients.length === 0" class="alert alert-warning py-2 small">
              La mascota seleccionada no tiene ingredientes asignados. Ve a la sección de Mascotas para asignar ingredientes.
            </div>
            <div v-else class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th style="width: 40px;">Usar</th>
                    <th>Ingrediente</th>
                    <th>Gramos por bolsa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="selection in form.selections" :key="selection.ingredientId">
                    <td>
                      <input
                        v-model="selection.selected"
                        type="checkbox"
                        class="form-check-input"
                      />
                    </td>
                    <td>
                      {{
                        availableIngredients.find((i) => i.ingredient._id === selection.ingredientId)?.ingredient?.name ||
                        'Ingrediente no encontrado'
                      }}
                    </td>
                    <td>
                      <input
                        v-model.number="selection.gramsPerBag"
                        type="number"
                        min="0"
                        class="form-control form-control-sm"
                        :disabled="!selection.selected"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="col-12 d-flex gap-2 justify-content-end">
            <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving || !form.petId">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              {{ form.id ? 'Guardar cambios' : 'Crear bolsa' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Listado de bolsas incompletas -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h3 class="h6 mb-0">Listado</h3>
      <span v-if="loading" class="small text-muted">
        <span class="spinner-border spinner-border-sm me-1"></span>Cargando...
      </span>
    </div>

    <div v-if="!bags.length && !loading" class="text-center py-5">
      <i class="bi bi-bag text-muted" style="font-size: 2.5rem;"></i>
      <p class="text-muted mt-2 mb-0">No hay bolsas incompletas actualmente.</p>
    </div>

    <!-- Vista desktop: tabla -->
    <div v-else class="d-none d-md-block card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Nombre</th>
                <th>Mascota</th>
                <th>Cantidad</th>
                <th>Ingredientes</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bag in bags" :key="bag._id" :class="{ 'table-secondary': completingBags.has(bag._id) }">
                <td class="fw-semibold">
                  {{ bag.name }}
                  <span v-if="completingBags.has(bag._id)" class="text-muted small ms-2">
                    <i class="bi bi-arrow-clockwise spinning"></i> Completando...
                  </span>
                </td>
                <td>
                  <span v-if="bag.pet">
                    <i class="bi bi-heart-fill text-danger me-1 small"></i>{{ bag.pet.name }}
                  </span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td>
                  <span class="badge bg-primary">{{ bag.quantity }}</span>
                </td>
                <td>
                  <div class="small">
                    <span
                      v-for="bi in bag.ingredients" :key="bi.ingredient?._id"
                      class="badge bg-light text-dark border me-1 mb-1"
                    >
                      {{ bi.ingredient?.name }} {{ bi.gramsPerBag }}g
                    </span>
                  </div>
                </td>
                <td>
                  <button type="button" class="btn btn-outline-secondary btn-sm me-1" aria-label="Editar" @click="editBag(bag)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm me-1"
                    aria-label="Marcar completada"
                    @click="completeBag(bag)"
                    :disabled="completingBags.has(bag._id)"
                  >
                    <span v-if="completingBags.has(bag._id)" class="spinner-border spinner-border-sm" role="status"></span>
                    <i v-else class="bi bi-check-lg"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-sm" aria-label="Eliminar" @click="deleteBag(bag)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Vista mobile: cards -->
    <div v-if="bags.length" class="d-md-none">
      <div
        v-for="bag in bags"
        :key="bag._id"
        class="bag-card mb-3"
        :class="{ 'completing': completingBags.has(bag._id) }"
      >
        <div class="card">
          <div class="card-header py-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">{{ bag.name }}</div>
                <div v-if="bag.pet" class="small text-muted mt-1">
                  <i class="bi bi-heart-fill text-danger me-1"></i>{{ bag.pet.name }}
                </div>
              </div>
              <span class="badge bg-primary ms-2">{{ bag.quantity }} bolsas</span>
            </div>
          </div>
          <div class="card-body py-2">
            <!-- Ingredientes -->
            <div class="mb-3">
              <div class="small text-muted mb-1">Ingredientes</div>
              <div>
                <span
                  v-for="bi in bag.ingredients"
                  :key="bi.ingredient?._id"
                  class="badge bg-light text-dark border me-1 mb-1"
                >
                  {{ bi.ingredient?.name }}
                  <span class="text-muted">{{ bi.gramsPerBag }}g</span>
                </span>
              </div>
            </div>
            <!-- Acciones -->
            <div class="row g-2">
              <div class="col-4">
                <button type="button" class="btn btn-outline-secondary btn-sm w-100" @click="editBag(bag)">
                  <i class="bi bi-pencil me-1"></i>Editar
                </button>
              </div>
              <div class="col-4">
                <button
                  type="button"
                  class="btn btn-outline-success btn-sm w-100"
                  @click="completeBag(bag)"
                  :disabled="completingBags.has(bag._id)"
                >
                  <span v-if="completingBags.has(bag._id)" class="spinner-border spinner-border-sm" role="status"></span>
                  <template v-else><i class="bi bi-check-lg me-1"></i>Completar</template>
                </button>
              </div>
              <div class="col-4">
                <button type="button" class="btn btn-outline-danger btn-sm w-100" @click="deleteBag(bag)">
                  <i class="bi bi-trash me-1"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.table-secondary {
  background-color: #f8f9fa !important;
}

/* Cards mobile */
.bag-card .card {
  border: 1px solid #dee2e6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s ease;
}

.bag-card .card-header {
  background-color: #f8f9fa;
}

.bag-card.completing .card {
  opacity: 0.7;
}

/* badges de ingredientes */
.badge.bg-light {
  border-color: #dee2e6 !important;
  font-size: 0.75rem;
}

@media (max-width: 575.98px) {
  .bag-card .card-body,
  .bag-card .card-header {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
</style>
