<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';
import { useToastStore } from '../stores/toast.js';

const toast = useToastStore();

const ingredients = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const searchQuery = ref('');

const filteredIngredients = computed(() => {
  if (!searchQuery.value.trim()) return ingredients.value;
  const query = searchQuery.value.toLowerCase();
  return ingredients.value.filter(i => 
    i.name.toLowerCase().includes(query) || i.code.toLowerCase().includes(query)
  );
});

const form = ref({
  id: null,
  name: '',
  code: '',
});

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    code: '',
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
    if (!form.value.name || !form.value.code) {
      error.value = 'Nombre y código son obligatorios';
      return;
    }
    const payload = {
      name: form.value.name,
      code: form.value.code,
    };
    if (form.value.id) {
      const updated = await api.put(`/ingredients/${form.value.id}`, payload);
      ingredients.value = ingredients.value.map((i) =>
        i._id === updated._id ? updated : i,
      );
      toast.success('Ingrediente actualizado correctamente');
    } else {
      const created = await api.post('/ingredients', payload);
      ingredients.value.unshift(created);
      toast.success('Ingrediente creado correctamente');
    }
    resetForm();
  } catch (e) {
    toast.error(e.message || 'No se pudo guardar el ingrediente');
  } finally {
    saving.value = false;
  }
};

const editIngredient = (ingredient) => {
  form.value = {
    id: ingredient._id,
    name: ingredient.name,
    code: ingredient.code,
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
    toast.success('Ingrediente eliminado');
    error.value = '';
  } catch (e) {
    toast.error(e.message || 'No se pudo eliminar el ingrediente');
  }
};

onMounted(loadIngredients);
</script>

<template>
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Ingredientes</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Gestiona los ingredientes disponibles
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
          {{ form.id ? 'Editar ingrediente' : 'Nuevo ingrediente' }}
        </h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="onSubmit">
          <div class="row g-3">
            <div class="col-12 col-md-5">
              <label class="form-label">Nombre</label>
              <input
                v-model="form.name"
                type="text"
                class="form-control"
                required
                placeholder="Ej: Pollo"
              />
            </div>
            <div class="col-12 col-md-5">
              <label class="form-label">Código interno</label>
              <input
                v-model="form.code"
                type="text"
                class="form-control"
                required
                placeholder="Ej: POLLO"
              />
            </div>
            <div class="col-12 col-md-2">
              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary flex-grow-1" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
                  {{ form.id ? 'Guardar' : 'Añadir' }}
                </button>
                <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Ingredients List -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h3 class="h6 mb-0">Listado de Ingredientes</h3>
        <span v-if="loading" class="small" style="color: var(--color-text-secondary);">
          <span class="spinner-border spinner-border-sm me-1"></span>Cargando...
        </span>
      </div>
      <div class="card-body p-0">
        <!-- Search -->
        <div class="p-3" style="border-bottom: 1px solid var(--color-border);">
          <div class="input-group">
            <span class="input-group-text" style="background-color: var(--color-muted); border-color: var(--color-border-strong);">
              <i class="bi bi-search"></i>
            </span>
            <input
              v-model="searchQuery"
              type="text"
              class="form-control"
              placeholder="Buscar ingrediente..."
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

        <div v-if="!ingredients.length && !loading" class="text-center py-5">
          <i class="bi bi-inbox mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
          <p class="mb-0" style="color: var(--color-text-secondary);">
            No hay ingredientes aún. Crea el primero.
          </p>
        </div>
        
        <template v-else>
          <!-- Mobile Cards -->
          <div class="d-md-none">
            <div v-for="ingredient in filteredIngredients" :key="ingredient._id" class="ingredient-item mx-3 mt-3">
              <div class="card">
                <div class="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-1 fw-semibold">{{ ingredient.name }}</h6>
                    <small style="color: var(--color-text-secondary);">Código: <code>{{ ingredient.code }}</code></small>
                  </div>
                  <div class="d-flex gap-2">
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      @click="editIngredient(ingredient)"
                      aria-label="Editar"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      @click="deleteIngredient(ingredient)"
                      aria-label="Eliminar"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop Table -->
          <div class="d-none d-md-block">
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th style="width: 180px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ingredient in filteredIngredients" :key="ingredient._id">
                    <td class="fw-semibold">{{ ingredient.name }}</td>
                    <td><code>{{ ingredient.code }}</code></td>
                    <td>
                      <div class="d-flex gap-2">
                        <button
                          type="button"
                          class="btn btn-outline-secondary btn-sm"
                          @click="editIngredient(ingredient)"
                        >
                          <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                        <button
                          type="button"
                          class="btn btn-outline-danger btn-sm"
                          @click="deleteIngredient(ingredient)"
                        >
                          <i class="bi bi-trash me-1"></i>Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

