<script setup>
import { onMounted, ref } from 'vue';
import api from '../api/client.js';

const ingredients = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

const form = ref({
  id: null,
  name: '',
  code: '',
  gramsPerPortion: 100,
});

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    code: '',
    gramsPerPortion: 100,
  };
};

const loadIngredients = async () => {
  loading.value = true;
  error.value = '';
  try {
    ingredients.value = await api.get('/ingredients');
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar los ingredientes';
  } finally {
    loading.value = false;
  }
};

const onSubmit = async () => {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    if (!form.value.name || !form.value.code || !form.value.gramsPerPortion) {
      error.value = 'Nombre, código y gramos por porción son obligatorios';
      return;
    }
    const payload = {
      name: form.value.name,
      code: form.value.code,
      gramsPerPortion: Number(form.value.gramsPerPortion),
    };
    if (form.value.id) {
      const updated = await api.put(`/ingredients/${form.value.id}`, payload);
      ingredients.value = ingredients.value.map((i) =>
        i._id === updated._id ? updated : i,
      );
      success.value = 'Ingrediente actualizado correctamente';
    } else {
      const created = await api.post('/ingredients', payload);
      ingredients.value.unshift(created);
      success.value = 'Ingrediente creado correctamente';
    }
    resetForm();
  } catch (e) {
    error.value = e.message || 'No se pudo guardar el ingrediente';
  } finally {
    saving.value = false;
  }
};

const editIngredient = (ingredient) => {
  form.value = {
    id: ingredient._id,
    name: ingredient.name,
    code: ingredient.code,
    gramsPerPortion: ingredient.gramsPerPortion,
  };
  success.value = '';
  error.value = '';
};

const deleteIngredient = async (ingredient) => {
  const confirmDelete = window.confirm(
    `¿Eliminar ingrediente "${ingredient.name}"?\nLas bolsas que lo contengan deberán actualizarse manualmente.`,
  );
  if (!confirmDelete) return;

  try {
    await api.delete(`/ingredients/${ingredient._id}`);
    ingredients.value = ingredients.value.filter((i) => i._id !== ingredient._id);
    success.value = 'Ingrediente eliminado';
    error.value = '';
  } catch (e) {
    error.value = e.message || 'No se pudo eliminar el ingrediente';
  }
};

onMounted(loadIngredients);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Ingredientes</h2>
    </div>

    <p class="text-muted small mb-3">
      Gestiona los ingredientes disponibles, su código interno y los gramos por porción usados para
      los cálculos de compra.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <div class="card mb-4">
      <div class="card-body">
        <h3 class="h6 mb-3">
          {{ form.id ? 'Editar ingrediente' : 'Nuevo ingrediente' }}
        </h3>
        <form @submit.prevent="onSubmit" class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              class="form-control"
              required
              placeholder="Ej: Pollo"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Código interno</label>
            <input
              v-model="form.code"
              type="text"
              class="form-control"
              required
              placeholder="Ej: POLLO"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">Gramos por porción</label>
            <input
              v-model.number="form.gramsPerPortion"
              type="number"
              min="1"
              class="form-control"
              required
            />
          </div>
          <div class="col-md-1 d-flex align-items-end">
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
          <h3 class="h6 mb-0">Listado de ingredientes</h3>
          <span v-if="loading" class="small text-muted">Cargando...</span>
        </div>
        <div v-if="!ingredients.length && !loading" class="text-muted small">
          No hay ingredientes aún. Crea el primero con el formulario superior.
        </div>
        <div class="table-responsive" v-else>
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                <th>Gramos por porción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ingredient in ingredients" :key="ingredient._id">
                <td>{{ ingredient.name }}</td>
                <td>{{ ingredient.code }}</td>
                <td>{{ ingredient.gramsPerPortion }} g</td>
                <td>
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm me-2"
                    @click="editIngredient(ingredient)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    @click="deleteIngredient(ingredient)"
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

