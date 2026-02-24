<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';

const pets = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

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

const savePortions = async () => {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    const updates = [];
    
    for (const pet of pets.value) {
      if (pet.ingredients && pet.ingredients.length > 0) {
        updates.push(
          api.put(`/pets/${pet._id}/ingredients`, {
            ingredients: pet.ingredients.map(ing => ({
              ingredient: ing.ingredient._id,
              gramsPerPortion: ing.gramsPerPortion
            }))
          })
        );
      }
    }
    
    await Promise.all(updates);
    success.value = 'Cantidades por porción guardadas correctamente';
  } catch (e) {
    error.value = e.message || 'No se pudieron guardar las cantidades';
  } finally {
    saving.value = false;
  }
};

const totals = computed(() => {
  const result = [];
  
  pets.value.forEach(pet => {
    if (pet.ingredients && pet.ingredients.length > 0) {
      pet.ingredients.forEach(ing => {
        const desired = Number(ing.desiredPortions || 0);
        const gramsPerPortion = Number(ing.gramsPerPortion || 0);
        const totalGrams = desired * gramsPerPortion;
        const kilos = totalGrams >= 1000 ? totalGrams / 1000 : 0;
        
        result.push({
          petId: pet._id,
          petName: pet.name,
          ingredientId: ing.ingredient._id,
          ingredientName: ing.ingredient.name,
          desiredPortions: desired,
          gramsPerPortion,
          totalGrams,
          kilos
        });
      });
    }
  });
  
  return result;
});

onMounted(loadPets);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Porciones por mascota y cantidades a comprar</h2>
    </div>

    <p class="text-muted small mb-3">
      Indica cuántas porciones deseas preparar de cada ingrediente por mascota. La aplicación calcula los gramos
      y convierte automáticamente a kilogramos cuando corresponde.
    </p>

    <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
    <div v-if="success" class="alert alert-success py-2">{{ success }}</div>

    <div class="card">
      <div class="card-body">
        <div v-if="!pets.length && !loading" class="text-muted small">
          No hay mascotas aún. Crea mascotas y asigna ingredientes en la sección de Mascotas.
        </div>
        <div v-else-if="totals.length === 0 && !loading" class="text-muted small">
          Las mascotas no tienen ingredientes asignados. Ve a la sección de Mascotas para asignar ingredientes.
        </div>
        <div class="table-responsive" v-else>
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Mascota</th>
                <th>Ingrediente</th>
                <th>Gramos por porción</th>
                <th>Porciones deseadas</th>
                <th>Total a comprar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in totals" :key="`${row.petId}-${row.ingredientId}`">
                <td>{{ row.petName }}</td>
                <td>{{ row.ingredientName }}</td>
                <td>{{ row.gramsPerPortion }} g</td>
                <td style="max-width: 120px;">
                  <input
                    v-model.number="
                      pets
                        .find(p => p._id === row.petId)
                        .ingredients.find(i => i.ingredient._id === row.ingredientId)
                        .desiredPortions
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
        <div class="d-flex justify-content-end mt-3" v-if="totals.length > 0">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="savePortions">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
            Guardar porciones
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

