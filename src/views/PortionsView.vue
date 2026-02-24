<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';

const pets = ref([]);
const bags = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

const loadPets = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [petsData, bagsData] = await Promise.all([
      api.get('/pets'),
      api.get('/bags')
    ]);
    pets.value = petsData;
    bags.value = bagsData.filter(bag => !bag.isCompleted); // Solo bolsas incompletas
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar los datos';
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
              gramsPerPortion: ing.gramsPerPortion,
              desiredPortions: ing.desiredPortions || 0
            }))
          })
        );
      }
    }
    
    await Promise.all(updates);
    success.value = 'Porciones deseadas guardadas correctamente';
  } catch (e) {
    error.value = e.message || 'No se pudieron guardar las porciones';
  } finally {
    saving.value = false;
  }
};

// Calcula cuántas porciones faltan por ingrediente en las bolsas incompletas
const getMissingPortions = (ingredientId) => {
  let missingPortions = 0;
  
  bags.value.forEach(bag => {
    if (!bag.pet) return; // Skip bolsas sin mascota
    
    // Manejar tanto objetos como IDs en bag.pet
    const bagPetId = typeof bag.pet === 'object' ? bag.pet._id : bag.pet;
    
    // Encontrar la mascota de esta bolsa
    const pet = pets.value.find(p => p._id === bagPetId);
    if (!pet || !pet.ingredients) return;
    
    // Verificar si la mascota debe tener este ingrediente
    const petShouldHaveIngredient = pet.ingredients.some(ing => 
      (typeof ing.ingredient === 'object' ? ing.ingredient._id : ing.ingredient) === ingredientId
    );
    if (!petShouldHaveIngredient) return;
    
    // Verificar si la bolsa ya tiene este ingrediente
    const bagHasIngredient = bag.ingredients.some(bagIng => {
      const bagIngId = typeof bagIng.ingredient === 'object' ? bagIng.ingredient._id : bagIng.ingredient;
      return bagIngId === ingredientId;
    });
    
    // Si la mascota debe tener el ingrediente pero la bolsa no lo tiene, cuenta como faltante
    if (!bagHasIngredient) {
      missingPortions += bag.quantity || 1;
    }
  });
  
  return missingPortions;
};

// Obtiene las bolsas que necesitan un ingrediente específico para una mascota
const getMissingBagsForIngredient = (ingredientId, petId) => {
  return bags.value.filter(bag => {
    if (!bag.pet) return false;
    
    // Solo bolsas de la mascota específica
    const bagPetId = typeof bag.pet === 'object' ? bag.pet._id : bag.pet;
    if (bagPetId !== petId) return false;
    
    // Encontrar la mascota
    const pet = pets.value.find(p => p._id === petId);
    if (!pet || !pet.ingredients) return false;
    
    // Verificar si la mascota debe tener este ingrediente
    const petShouldHaveIngredient = pet.ingredients.some(ing => 
      (typeof ing.ingredient === 'object' ? ing.ingredient._id : ing.ingredient) === ingredientId
    );
    if (!petShouldHaveIngredient) return false;
    
    // Verificar si la bolsa ya tiene este ingrediente
    const bagHasIngredient = bag.ingredients.some(bagIng => {
      const bagIngId = typeof bagIng.ingredient === 'object' ? bagIng.ingredient._id : bagIng.ingredient;
      return bagIngId === ingredientId;
    });
    
    // Retorna true si la bolsa NO tiene el ingrediente (lo necesita)
    return !bagHasIngredient;
  });
};

// Obtiene los nombres de los ingredientes que faltan en una bolsa específica
const getMissingIngredientsForBag = (bag) => {
  if (!bag.pet) return [];
  
  const bagPetId = typeof bag.pet === 'object' ? bag.pet._id : bag.pet;
  const pet = pets.value.find(p => p._id === bagPetId);
  if (!pet || !pet.ingredients) return [];
  
  const missingIngredients = [];
  
  pet.ingredients.forEach(petIng => {
    const petIngId = typeof petIng.ingredient === 'object' ? petIng.ingredient._id : petIng.ingredient;
    const petIngName = typeof petIng.ingredient === 'object' ? petIng.ingredient.name : 'Ingrediente';
    
    const bagHasIngredient = bag.ingredients.some(bagIng => {
      const bagIngId = typeof bagIng.ingredient === 'object' ? bagIng.ingredient._id : bagIng.ingredient;
      return bagIngId === petIngId;
    });
    
    if (!bagHasIngredient) {
      missingIngredients.push(petIngName);
    }
  });
  
  return missingIngredients;
};

const totals = computed(() => {
  const result = [];
  
  pets.value.forEach(pet => {
    if (pet.ingredients && pet.ingredients.length > 0) {
      pet.ingredients.forEach(ing => {
        const desired = Number(ing.desiredPortions || 0);
        const missing = getMissingPortions(ing.ingredient._id);
        const totalPortions = desired + missing;
        const gramsPerPortion = Number(ing.gramsPerPortion || 0);
        const totalGrams = totalPortions * gramsPerPortion;
        const kilos = totalGrams >= 1000 ? totalGrams / 1000 : 0;
        
        result.push({
          petId: pet._id,
          petName: pet.name,
          ingredientId: ing.ingredient._id,
          ingredientName: ing.ingredient.name,
          desiredPortions: desired,
          missingPortions: missing,
          totalPortions,
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
      Indica cuántas porciones deseas preparar de cada ingrediente por mascota. 
      <strong>Se incluyen automáticamente las porciones faltantes de bolsas incompletas.</strong>
      La aplicación calcula los gramos y convierte automáticamente a kilogramos cuando corresponde.
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
                <th>Faltantes (bolsas incompletas)</th>
                <th>Total porciones</th>
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
                  <span class="badge" :class="row.missingPortions > 0 ? 'bg-warning text-dark' : 'bg-secondary'">
                    {{ row.missingPortions }}
                  </span>
                  <div v-if="row.missingPortions > 0" class="small text-muted mt-1">
                    Bolsas incompletas
                  </div>
                </td>
                <td>
                  <strong>{{ row.totalPortions }}</strong>
                  <div class="small text-muted">
                    {{ row.desiredPortions }} deseadas + {{ row.missingPortions }} faltantes
                  </div>
                </td>
                <td>
                  <span v-if="row.kilos">
                    <strong>{{ row.kilos.toFixed(2) }} kg</strong>
                    <span class="text-muted small d-block">({{ row.totalGrams }} g)</span>
                  </span>
                  <span v-else><strong>{{ row.totalGrams }} g</strong></span>
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

    <!-- Información sobre bolsas incompletas -->
    <div v-if="bags.length > 0" class="card mt-4">
      <div class="card-body">
        <h5 class="h6 mb-3">
          <i class="bi bi-info-circle me-2"></i>
          Bolsas incompletas detectadas ({{ bags.length }})
        </h5>
        <p class="text-muted small mb-3">
          Las porciones faltantes se calculan automáticamente basándose en las bolsas incompletas que necesitan ingredientes adicionales.
        </p>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Bolsa</th>
                <th>Mascota</th>
                <th>Cantidad</th>
                <th>Ingredientes faltantes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bag in bags" :key="bag._id">
                <td>{{ bag.name }}</td>
                <td>{{ bag.pet?.name || 'Sin mascota' }}</td>
                <td>{{ bag.quantity || 1 }}</td>
                <td>
                  <span v-if="bag.pet" class="small">
                    <span 
                      v-for="missing in getMissingIngredientsForBag(bag)" 
                      :key="missing" 
                      class="badge bg-light text-dark me-1"
                    >
                      {{ missing }}
                    </span>
                    <span v-if="getMissingIngredientsForBag(bag).length === 0" class="text-success">
                      Ninguno (bolsa completa)
                    </span>
                  </span>
                  <span v-else class="text-muted small">Sin mascota asignada</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

