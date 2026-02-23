<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';

const ingredients = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

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

const savePortions = async () => {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    const updates = ingredients.value.map((i) =>
      api.put(`/ingredients/${i._id}`, {
        name: i.name,
        code: i.code,
        gramsPerPortion: i.gramsPerPortion,
        desiredPortions: i.desiredPortions || 0,
      }),
    );
    await Promise.all(updates);
    success.value = 'Porciones deseadas guardadas correctamente';
  } catch (e) {
    error.value = e.message || 'No se pudieron guardar las porciones';
  } finally {
    saving.value = false;
  }
};

const totals = computed(() =>
  ingredients.value.map((i) => {
    const desired = Number(i.desiredPortions || 0);
    const perPortion = Number(i.gramsPerPortion || 0);
    const totalGrams = desired * perPortion;
    const kilos = totalGrams >= 1000 ? totalGrams / 1000 : 0;
    return {
      id: i._id,
      name: i.name,
      desiredPortions: desired,
      gramsPerPortion: perPortion,
      totalGrams,
      kilos,
    };
  }),
);

onMounted(loadIngredients);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Porciones deseadas y cantidades a comprar</h2>
    </div>

    <p class="text-muted small mb-3">
      Indica cuántas porciones deseas preparar de cada ingrediente. La aplicación calcula los gramos
      y convierte automáticamente a kilogramos cuando corresponde.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Gramos por porción</th>
                <th>Porciones deseadas</th>
                <th>Total a comprar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in totals" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.gramsPerPortion }} g</td>
                <td style="max-width: 120px;">
                  <input
                    v-model.number="
                      ingredients.find((i) => i._id === row.id).desiredPortions
                    "
                    type="number"
                    min="0"
                    class="form-control form-control-sm"
                  />
                </td>
                <td>
                  <span v-if="row.kilos">
                    {{ row.kilos.toFixed(2) }} kg
                    <span class="text-muted small">({{ row.totalGrams }} g)</span>
                  </span>
                  <span v-else>{{ row.totalGrams }} g</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-end mt-3">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="savePortions">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
            Guardar porciones
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

