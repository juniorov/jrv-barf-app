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

const maxIngredientsPerBag = computed(
  () => auth.user?.maxIngredientsPerBag ?? 5,
);

const form = ref({
  id: null,
  name: '',
  quantity: 1,
  petId: null,
  selections: [],
});

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    quantity: 1,
    petId: null,
    selections: ingredients.value.map((i) => ({
      ingredientId: i._id,
      selected: false,
      gramsPerBag: i.gramsPerPortion || 0,
    })),
  };
};

const loadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [ing, bs, ps] = await Promise.all([
      api.get('/ingredients'),
      api.get('/bags'),
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
  form.value.selections = ingredients.value.map((i) => {
    const found = bag.ingredients.find(
      (bi) => bi.ingredient && bi.ingredient._id === i._id,
    );
    return {
      ingredientId: i._id,
      selected: !!found,
      gramsPerBag: found ? found.gramsPerBag : i.gramsPerPortion || 0,
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

const completeBag = async (bag) => {
  const confirmComplete = window.confirm(
    `¿Marcar la bolsa "${bag.name}" como completada? Se incrementará el contador de bolsas completadas en el inventario.`,
  );
  if (!confirmComplete) return;

  try {
    await api.post(`/bags/${bag._id}/complete`, {});
    bags.value = bags.value.filter((b) => b._id !== bag._id);
    success.value = 'Bolsa marcada como completada';
    error.value = '';
  } catch (e) {
    error.value = e.message || 'No se pudo completar la bolsa';
  }
};

const availableCompletedBags = (bag) =>
  Math.max(0, bag.completedCount - (bag.consumedCount || 0));

onMounted(loadData);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Bolsas incompletas</h2>
      <span class="badge bg-secondary" v-if="maxIngredientsPerBag">
        Máx. {{ maxIngredientsPerBag }} ingredientes por bolsa
      </span>
    </div>

    <p class="text-muted small mb-3">
      Define bolsas o platos incompletos indicando qué ingredientes llevan y en qué cantidad. Puedes
      marcar una bolsa como completada para actualizar tu inventario.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

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
            <select v-model="form.petId" class="form-select">
              <option :value="null">Sin mascota asociada</option>
              <option v-for="pet in pets" :key="pet._id" :value="pet._id">
                {{ pet.name }} ({{ pet.age }} años)
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
            <div class="table-responsive">
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
                        ingredients.find((i) => i._id === selection.ingredientId)?.name ||
                        'Ingrediente'
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
          <div class="col-12 d-flex justify-content-end">
            <button type="submit" class="btn btn-primary" :disabled="saving || !ingredients.length">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              {{ form.id ? 'Guardar cambios' : 'Crear bolsa' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h3 class="h6 mb-0">Listado de bolsas incompletas</h3>
          <span v-if="loading" class="small text-muted">Cargando...</span>
        </div>
        <div v-if="!bags.length && !loading" class="text-muted small">
          No hay bolsas incompletas actualmente.
        </div>
        <div class="table-responsive" v-else>
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Mascota</th>
                <th>Cantidad</th>
                <th>Ingredientes</th>
                <th>Completadas / Disponibles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bag in bags" :key="bag._id">
                <td>{{ bag.name }}</td>
                <td>
                  <span v-if="bag.pet">
                    {{ bag.pet.name }} ({{ bag.pet.age }} años)
                  </span>
                  <span v-else class="text-muted small">Sin mascota</span>
                </td>
                <td>{{ bag.quantity }}</td>
                <td>
                  <ul class="list-unstyled mb-0 small">
                    <li v-for="bi in bag.ingredients" :key="bi.ingredient?._id">
                      {{ bi.ingredient?.name }} - {{ bi.gramsPerBag }} g
                    </li>
                  </ul>
                </td>
                <td>
                  {{ bag.completedCount }}
                  <span class="text-muted small">
                    ({{ availableCompletedBags(bag) }} disponibles)
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm me-2"
                    @click="editBag(bag)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm me-2"
                    @click="completeBag(bag)"
                  >
                    Marcar completada
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    @click="deleteBag(bag)"
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

