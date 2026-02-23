<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../api/client.js';

const auth = useAuthStore();

const maxIngredientsPerBag = ref(auth.user?.maxIngredientsPerBag ?? 5);
const error = ref('');
const success = ref('');
const saving = ref(false);

const saveConfig = async () => {
  error.value = '';
  success.value = '';
  if (!maxIngredientsPerBag.value || maxIngredientsPerBag.value < 1) {
    error.value = 'La cantidad máxima debe ser un número positivo';
    return;
  }
  saving.value = true;
  try {
    const res = await api.put('/config/settings', {
      maxIngredientsPerBag: Number(maxIngredientsPerBag.value),
    });
    if (auth.user) {
      auth.user.maxIngredientsPerBag = res.maxIngredientsPerBag;
      localStorage.setItem('barf_user', JSON.stringify(auth.user));
    }
    success.value = 'Configuración guardada correctamente';
  } catch (e) {
    error.value = e.message || 'No se pudo guardar la configuración';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Configuración de la aplicación</h2>
    </div>

    <p class="text-muted small mb-3">
      Ajusta el número máximo de ingredientes permitidos por bolsa o plato completo. Esta
      configuración se aplica a tu usuario.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="saveConfig" class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Máximo de ingredientes por bolsa</label>
            <input
              v-model.number="maxIngredientsPerBag"
              type="number"
              min="1"
              class="form-control"
              required
            />
          </div>
          <div class="col-12 d-flex justify-content-end">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              Guardar configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

