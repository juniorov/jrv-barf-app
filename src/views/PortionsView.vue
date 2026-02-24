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

// Verificar si solo hay una mascota
const hasSinglePet = computed(() => pets.value.length === 1);

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
          <!-- Vista desktop -->
          <div class="d-none d-lg-block">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th v-if="!hasSinglePet">Mascota</th>
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
                  <td v-if="!hasSinglePet">{{ row.petName }}</td>
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

          <!-- Vista mobile optimizada -->
          <div class="d-lg-none">
            <div class="mb-2" v-if="hasSinglePet">
              <span class="badge bg-primary">
                <i class="bi bi-heart-fill me-1"></i>{{ pets[0].name }}
              </span>
            </div>

            <div v-for="row in totals" :key="`${row.petId}-${row.ingredientId}`" class="card mb-3">
              <div class="card-header py-2">
                <div class="d-flex justify-content-between align-items-center">
                  <h6 class="mb-0 fw-bold">{{ row.ingredientName }}</h6>
                  <span v-if="!hasSinglePet" class="badge bg-light text-dark">
                    {{ row.petName }}
                  </span>
                </div>
              </div>
              <div class="card-body p-3">
                <div class="row mb-3">
                  <div class="col-6">
                    <small class="text-muted d-block">Porciones deseadas:</small>
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
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">Total porciones:</small>
                    <span class="fw-medium">{{ row.totalPortions }}</span>
                    <div class="small text-muted">{{ row.desiredPortions }} + {{ row.missingPortions }}</div>
                  </div>
                </div>

                <div class="text-center p-2 bg-light rounded">
                  <div class="h5 mb-0">
                    <span v-if="row.kilos">
                      <strong class="text-success">{{ row.kilos.toFixed(2) }} kg</strong>
                    </span>
                    <span v-else>
                      <strong class="text-success">{{ row.totalGrams }} g</strong>
                    </span>
                  </div>
                  <small class="text-muted">Total a comprar</small>
                </div>
              </div>
            </div>
          </div>
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
          <!-- Vista desktop -->
          <div class="d-none d-md-block">
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

          <!-- Vista mobile compacta -->
          <div class="d-md-none">
            <div v-for="bag in bags" :key="bag._id" class="card mb-2">
              <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h6 class="mb-0 fw-medium">{{ bag.name }}</h6>
                  <span class="badge bg-secondary">{{ bag.quantity || 1 }}</span>
                </div>
                <div v-if="bag.pet" class="small">
                  <div class="text-muted mb-1">{{ bag.pet.name }} - Faltantes:</div>
                  <div>
                    <span
                      v-for="missing in getMissingIngredientsForBag(bag)"
                      :key="missing"
                      class="badge bg-warning text-dark me-1 mb-1"
                    >
                      {{ missing }}
                    </span>
                    <span v-if="getMissingIngredientsForBag(bag).length === 0" class="text-success small">
                      ✓ Completa
                    </span>
                  </div>
                </div>
                <div v-else class="text-muted small">Sin mascota asignada</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

