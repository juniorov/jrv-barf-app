<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useBagStore } from '../stores/bags.js';
import { useToastStore } from '../stores/toast.js';

const auth = useAuthStore();
const bagStore = useBagStore();
const toast = useToastStore();

const pets = ref([]);
const bags = ref([]);
const allBags = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const searchQuery = ref('');
const showCompleted = ref(false);

const incompleteBags = computed(() => allBags.value.filter(b => !b.isCompleted));
const completedBags = computed(() => allBags.value.filter(b => b.isCompleted));

const displayBags = computed(() => showCompleted.value ? allBags.value : incompleteBags.value);

const filteredBags = computed(() => {
  if (!searchQuery.value.trim()) return displayBags.value;
  const query = searchQuery.value.toLowerCase();
  return displayBags.value.filter(b => 
    b.name.toLowerCase().includes(query) || 
    (b.pet && b.pet.name.toLowerCase().includes(query))
  );
});

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
  const petIngredients = selectedPet?.ingredients || [];
  return petIngredients;
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

  form.value.selections = petIngredients.map((i) => ({
    ingredientId: i.ingredient._id,
    selected: false,
    gramsPerBag: i.gramsPerPortion || 100,
  }));
};

const loadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [bs, ps] = await Promise.all([
      api.get('/bags'),
      api.get('/pets'),
    ]);
    pets.value = ps;
    allBags.value = bs;
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

const maxReached = computed(() => selectedCount.value >= maxIngredientsPerBag.value);

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
      allBags.value = allBags.value.map((b) =>
        b._id === updated._id ? updated : b,
      );
      toast.success('Bolsa actualizada correctamente');
    } else {
      const created = await api.post('/bags', payload);
      bags.value.unshift(created);
      allBags.value.unshift(created);
      toast.success('Bolsa creada correctamente');
    }
    resetForm();
  } catch (e) {
    toast.error(e.message || 'No se pudo guardar la bolsa');
  } finally {
    saving.value = false;
  }
};

const editBag = (bag) => {
  form.value.id = bag._id;
  form.value.name = bag.name;
  form.value.quantity = bag.quantity;
  form.value.petId = bag.pet?._id || null;

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

  // Scroll to form
  setTimeout(() => {
    const formCard = document.querySelector('.card.mb-4');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

const deleteBag = async (bag) => {
  const confirmDelete = window.confirm(
    `¿Eliminar bolsa "${bag.name}"? Esta acción no se puede deshacer.`,
  );
  if (!confirmDelete) return;

  try {
    await api.delete(`/bags/${bag._id}`);
    allBags.value = allBags.value.filter((b) => b._id !== bag._id);
    bags.value = bags.value.filter((b) => b._id !== bag._id);
    toast.success('Bolsa eliminada');
    error.value = '';
  } catch (e) {
    toast.error(e.message || 'No se pudo eliminar la bolsa');
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
    allBags.value = allBags.value.filter((b) => b._id !== bag._id);
    bags.value = bags.value.filter((b) => b._id !== bag._id);

    bagStore.markUpdated();

    toast.success(response.message || 'Bolsa completada correctamente');

  } catch (e) {
    toast.error(e.message || 'No se pudo completar la bolsa');
  } finally {
    // Remover de la lista de procesamiento
    completingBags.value.delete(bag._id);
  }
};

onMounted(loadData);
</script>

<template>
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Bolsas Incompletas</h2>
          <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
            Define y gestiona las bolsas de comida
          </p>
        </div>
        <div v-if="form.petId" class="badge" style="background-color: var(--color-success-bg); color: var(--color-success);">
          <i class="bi bi-heart-fill me-1"></i>
          {{ pets.find(p => p._id === form.petId)?.name }}
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>
    <div v-if="success" class="alert alert-success mb-3">{{ success }}</div>

    <!-- Form -->
    <div class="card mb-4">
      <div class="card-header">
        <h3 class="h6 mb-0" style="color: var(--color-text-primary);">
          <i class="bi bi-plus-circle me-2" style="color: var(--color-primary);"></i>
          {{ form.id ? 'Editar bolsa' : 'Nueva bolsa' }}
        </h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="onSubmit">
          <div class="row g-3">
            <div class="col-12 col-md-4">
              <label class="form-label">Nombre</label>
              <input
                v-model="form.name"
                type="text"
                class="form-control"
                required
                placeholder="Ej: Bolsa de pollo"
              />
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label">Cantidad</label>
              <input
                v-model.number="form.quantity"
                type="number"
                min="1"
                class="form-control"
                required
              />
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label">Mascota</label>
              <select v-model="form.petId" class="form-select" @change="updateSelectionsForPet">
                <option :value="null">Seleccionar...</option>
                <option v-for="pet in pets" :key="pet._id" :value="pet._id">
                  {{ pet.name }}
                </option>
              </select>
            </div>
            <div class="col-12" v-if="form.petId">
              <label class="form-label d-flex justify-content-between">
                <span>Ingredientes</span>
                <span 
                  style="font-size: var(--font-size-sm); font-weight: 500;"
                  :style="{ color: maxReached ? 'var(--color-danger)' : 'var(--color-text-secondary)' }"
                >
                  {{ selectedCount }} / {{ maxIngredientsPerBag }}
                  <i v-if="maxReached" class="bi bi-exclamation-circle-fill ms-1"></i>
                </span>
              </label>
              
              <div v-if="availableIngredients.length === 0" class="alert alert-warning py-2">
                <i class="bi bi-exclamation-triangle me-2"></i>
                La mascota no tiene ingredientes asignados
              </div>
              
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style="width: 50px;">Usar</th>
                      <th>Ingrediente</th>
                      <th style="width: 120px;">Gramos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="selection in form.selections" :key="selection.ingredientId">
                      <td>
                        <input
                          v-model="selection.selected"
                          type="checkbox"
                          class="form-check-input"
                          style="width: 20px; height: 20px;"
                          :disabled="maxReached && !selection.selected"
                        />
                      </td>
                      <td class="fw-semibold">
                        {{
                          availableIngredients.find((i) => i.ingredient._id === selection.ingredientId)?.ingredient?.name ||
                          'No encontrado'
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
            <div class="col-12" v-else>
              <div class="alert alert-info py-2">
                <i class="bi bi-info-circle me-2"></i>
                Selecciona una mascota para ver sus ingredientes
              </div>
            </div>
            <div class="col-12 d-flex gap-2 justify-content-end">
              <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" :disabled="saving || !form.petId">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
                {{ form.id ? 'Guardar Cambios' : 'Crear Bolsa' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Bags List -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="h6 mb-0">
        {{ showCompleted ? 'Historial de Bolsas' : 'Bolsas Existentes' }}
        <span class="badge ms-2" style="background-color: var(--color-muted); color: var(--color-text-secondary);">
          {{ showCompleted ? completedBags.length : incompleteBags.length }}
        </span>
      </h3>
      <div class="d-flex gap-2 align-items-center">
        <button 
          class="btn btn-sm"
          :class="showCompleted ? 'btn-outline-secondary' : 'btn-outline-primary'"
          @click="showCompleted = !showCompleted"
        >
          <i :class="showCompleted ? 'bi bi-clock-history' : 'bi bi-list-check'"></i>
          <span class="d-none d-sm-inline ms-1">{{ showCompleted ? 'Incompletas' : 'Historial' }}</span>
        </button>
        <span v-if="loading" class="small" style="color: var(--color-text-secondary);">
          <span class="spinner-border spinner-border-sm me-1"></span>Cargando...
        </span>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-3">
      <div class="input-group">
        <span class="input-group-text" style="background-color: var(--color-muted); border-color: var(--color-border-strong);">
          <i class="bi bi-search"></i>
        </span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="Buscar bolsa o mascota..."
          style="border-color: var(--color-border-strong);"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="btn btn-outline-secondary"
          @click="searchQuery = ''"
          aria-label="Limpiar búsqueda"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <div v-if="!allBags.length && !loading" class="text-center py-5">
      <i class="bi bi-bag mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
      <p class="mb-0" style="color: var(--color-text-secondary);">
        No hay bolsas incompletas
      </p>
    </div>

    <div v-else-if="filteredBags.length === 0 && searchQuery" class="text-center py-5">
      <i class="bi bi-search mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
      <p class="mb-0" style="color: var(--color-text-secondary);">
        No se encontraron bolsas
      </p>
    </div>

    <div v-else-if="showCompleted && completedBags.length === 0" class="text-center py-5">
      <i class="bi bi-clock-history mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
      <p class="mb-0" style="color: var(--color-text-secondary);">
        No hay bolsas completadas aún
      </p>
    </div>

    <template v-else>
      <!-- Mobile Cards -->
      <div class="d-md-none">
        <div
          v-for="bag in filteredBags"
          :key="bag._id"
          class="bag-card mx-3 mt-3"
          :class="{ 'completing': completingBags.has(bag._id), 'opacity-75': bag.isCompleted }"
        >
          <div class="card">
            <div class="card-header" :style="{ backgroundColor: bag.isCompleted ? 'var(--color-success-bg)' : 'var(--color-muted)' }">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold">
                    {{ bag.name }}
                    <span v-if="bag.isCompleted" class="badge ms-1" style="background-color: var(--color-success); color: white; font-size: 0.65rem;">
                      <i class="bi bi-check-circle me-1"></i>Completada
                    </span>
                  </div>
                  <div v-if="bag.pet" class="small mt-1" style="color: var(--color-text-secondary);">
                    <i class="bi bi-heart-fill me-1" style="color: var(--color-primary);"></i>{{ bag.pet.name }}
                  </div>
                  <div v-if="bag.completedAt" class="small" style="color: var(--color-text-muted);">
                    {{ new Date(bag.completedAt).toLocaleDateString('es-ES') }}
                  </div>
                </div>
                <span class="badge" :style="{ backgroundColor: bag.isCompleted ? 'var(--color-success)' : 'var(--color-primary)', color: 'white' }">
                  {{ bag.quantity }} bolsas
                </span>
              </div>
            </div>
            <div class="card-body">
              <!-- Ingredients -->
              <div class="mb-3">
                <div class="small mb-2" style="color: var(--color-text-secondary);">Ingredientes</div>
                <div class="d-flex flex-wrap gap-2">
                  <span
                    v-for="bi in bag.ingredients"
                    :key="bi.ingredient?._id"
                    class="badge"
                    style="background-color: var(--color-muted); color: var(--color-text-primary); border: 1px solid var(--color-border);"
                  >
                    {{ bi.ingredient?.name }} {{ bi.gramsPerBag }}g
                  </span>
                </div>
              </div>
            <!-- Actions -->
            <div v-if="!bag.isCompleted" class="d-grid gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="editBag(bag)">
                <i class="bi bi-pencil me-1"></i>Editar
              </button>
              <button
                type="button"
                class="btn btn-outline-success"
                @click="completeBag(bag)"
                :disabled="completingBags.has(bag._id)"
              >
                <span v-if="completingBags.has(bag._id)" class="spinner-border spinner-border-sm" role="status"></span>
                <template v-else><i class="bi bi-check-lg me-1"></i>Completar</template>
              </button>
              <button type="button" class="btn btn-outline-danger" @click="deleteBag(bag)">
                <i class="bi bi-trash me-1"></i>Eliminar
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="d-none d-md-block card">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead style="background-color: var(--color-muted);">
                <tr>
                  <th>Nombre</th>
                  <th>Mascota</th>
                  <th>Cantidad</th>
                  <th>Ingredientes</th>
                  <th style="width: 180px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
              <tr v-for="bag in filteredBags" :key="bag._id" :class="{ 'table-secondary': completingBags.has(bag._id), 'opacity-75': bag.isCompleted }">
                <td class="fw-semibold">
                  {{ bag.name }}
                  <span v-if="bag.isCompleted" class="badge ms-1" style="background-color: var(--color-success); color: white; font-size: 0.65rem;">
                    <i class="bi bi-check-circle me-1"></i>Completada
                  </span>
                  <span v-if="completingBags.has(bag._id)" class="small ms-2" style="color: var(--color-text-secondary);">
                    <i class="bi bi-arrow-clockwise spinning"></i> Completando...
                  </span>
                </td>
                  <td>
                    <span v-if="bag.pet">
                      <i class="bi bi-heart-fill me-1" style="color: var(--color-primary);"></i>{{ bag.pet.name }}
                    </span>
                    <span v-else style="color: var(--color-text-muted);">—</span>
                  </td>
                  <td>
                    <span class="badge" style="background-color: var(--color-primary); color: white;">{{ bag.quantity }}</span>
                  </td>
                  <td>
                    <div class="d-flex flex-wrap gap-1">
                      <span
                        v-for="bi in bag.ingredients" :key="bi.ingredient?._id"
                        class="badge"
                        style="background-color: var(--color-muted); color: var(--color-text-primary); border: 1px solid var(--color-border);"
                      >
                        {{ bi.ingredient?.name }} {{ bi.gramsPerBag }}g
                      </span>
                    </div>
                  </td>
                <td>
                  <div v-if="!bag.isCompleted" class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" @click="editBag(bag)" aria-label="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-success btn-sm"
                      @click="completeBag(bag)"
                      :disabled="completingBags.has(bag._id)"
                      aria-label="Completar"
                    >
                      <span v-if="completingBags.has(bag._id)" class="spinner-border spinner-border-sm" role="status"></span>
                      <i v-else class="bi bi-check-lg"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" @click="deleteBag(bag)" aria-label="Eliminar">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <div v-else style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                    <i class="bi bi-check-circle me-1"></i>Finalizada
                  </div>
                </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
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
  background-color: var(--color-muted) !important;
}

.bag-card .card {
  transition: box-shadow var(--transition-base);
}

.bag-card .card:hover {
  box-shadow: var(--shadow-md);
}

.bag-card.completing .card {
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .bag-card .card {
    transition: none;
  }
}

@media (max-width: 575.98px) {
  .bag-card .card-body,
  .bag-card .card-header {
    padding-left: var(--spacing-3);
    padding-right: var(--spacing-3);
  }
}
</style>
