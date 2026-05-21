<script setup>
import { onMounted, ref, computed } from 'vue';
import api from '../api/client.js';
import { useToastStore } from '../stores/toast.js';

const toast = useToastStore();

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
    toast.success('Porciones guardadas correctamente');
  } catch (e) {
    toast.error(e.message || 'No se pudieron guardar las porciones');
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

const shoppingSummary = computed(() => {
  const summary = [];
  const grouped = {};

  totals.value.forEach(row => {
    if (!grouped[row.ingredientName]) {
      grouped[row.ingredientName] = 0;
    }
    grouped[row.ingredientName] += row.totalGrams;
  });

  for (const [name, grams] of Object.entries(grouped)) {
    summary.push({ name, grams, kilos: grams >= 1000 ? grams / 1000 : 0 });
  }

  return summary;
});

const shoppingSummaryText = computed(() => {
  return shoppingSummary.value
    .map(item => {
      if (item.kilos > 0) {
        return `${item.name} ${item.kilos.toFixed(1)}kg (${item.grams}g)`;
      }
      return `${item.name} ${item.grams}g`;
    })
    .join('\n');
});

const copyShoppingList = async () => {
  try {
    await navigator.clipboard.writeText(shoppingSummaryText.value);
    toast.success('Lista copiada al portapapeles');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = shoppingSummaryText.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast.success('Lista copiada al portapapeles');
  }
};

const shareShoppingList = async () => {
  const text = `🛒 Lista de compras JRV BARF:\n\n${shoppingSummaryText.value}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Lista de compras JRV BARF',
        text: text,
      });
    } catch {
      // User cancelled share
    }
  } else {
    copyShoppingList();
  }
};

onMounted(loadPets);
</script>

<template>
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Porciones y Compras</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Calcula las porciones y cantidades a comprar
      </p>
    </div>

    <!-- Alerts -->
    <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>
    <div v-if="success" class="alert alert-success mb-3">{{ success }}</div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-body">
        <div v-if="!pets.length && !loading" class="text-center py-5">
          <i class="bi bi-inbox mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
          <p class="mb-0" style="color: var(--color-text-secondary);">
            No hay mascotas. Crea mascotas y asigna ingredientes primero.
          </p>
        </div>
        <div v-else-if="totals.length === 0 && !loading" class="text-center py-5">
          <i class="bi bi-grid mb-3" style="font-size: 3rem; color: var(--color-text-muted);"></i>
          <p class="mb-0" style="color: var(--color-text-secondary);">
            Las mascotas no tienen ingredientes asignados
          </p>
        </div>
        <div v-else>
          <!-- Single Pet Badge -->
          <div class="mb-3" v-if="hasSinglePet">
            <span class="badge" style="background-color: var(--color-primary); color: white; font-size: var(--font-size-base);">
              <i class="bi bi-heart-fill me-1"></i>{{ pets[0].name }}
            </span>
          </div>

          <!-- Mobile Cards View -->
          <div class="d-lg-none">
            <div v-for="row in totals" :key="`${row.petId}-${row.ingredientId}`" class="portion-card mb-3">
              <div class="card">
                <div class="card-header" style="background-color: var(--color-muted);">
                  <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold" style="color: var(--color-text-primary);">
                      {{ row.ingredientName }}
                    </h6>
                    <span v-if="!hasSinglePet" class="badge" style="background-color: var(--color-muted); color: var(--color-text-secondary);">
                      {{ row.petName }}
                    </span>
                  </div>
                </div>
                <div class="card-body">
                  <div class="row g-3 mb-3">
                    <div class="col-6">
                      <label class="form-label d-block">Porciones deseadas</label>
                      <input
                        v-model.number="
                          pets
                            .find(p => p._id === row.petId)
                            .ingredients.find(i => i.ingredient._id === row.ingredientId)
                            .desiredPortions
                        "
                        type="number"
                        min="0"
                        class="form-control"
                      />
                    </div>
                    <div class="col-6">
                      <div class="small mb-1" style="color: var(--color-text-secondary);">Total porciones</div>
                      <div class="fw-bold fs-4" style="color: var(--color-text-primary);">{{ row.totalPortions }}</div>
                      <div class="small" style="color: var(--color-text-secondary);">
                        {{ row.desiredPortions }} + {{ row.missingPortions }}
                      </div>
                    </div>
                  </div>

                  <!-- Total to Buy -->
                  <div class="text-center p-4 rounded" style="background-color: var(--color-success-bg);">
                    <div class="small mb-1" style="color: var(--color-text-secondary);">Total a comprar</div>
                    <div class="h3 mb-0 fw-bold" style="color: var(--color-success);">
                      <span v-if="row.kilos">
                        {{ row.kilos.toFixed(2) }} kg
                      </span>
                      <span v-else>
                        {{ row.totalGrams }} g
                      </span>
                    </div>
                    <div v-if="row.kilos" class="small mt-1" style="color: var(--color-text-secondary);">
                      ({{ row.totalGrams }} g)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop Table View -->
          <div class="d-none d-lg-block">
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th v-if="!hasSinglePet">Mascota</th>
                    <th>Ingrediente</th>
                    <th>Gramos/porción</th>
                    <th>Porciones deseadas</th>
                    <th>Faltantes</th>
                    <th>Total porciones</th>
                    <th>Total a comprar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in totals" :key="`${row.petId}-${row.ingredientId}`">
                    <td v-if="!hasSinglePet" class="fw-semibold">{{ row.petName }}</td>
                    <td class="fw-semibold">{{ row.ingredientName }}</td>
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
                      <span class="badge" :style="{
                        backgroundColor: row.missingPortions > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                        color: row.missingPortions > 0 ? 'white' : 'var(--color-text-primary)'
                      }">
                        {{ row.missingPortions }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ row.totalPortions }}</strong>
                      <div class="small" style="color: var(--color-text-secondary);">
                        {{ row.desiredPortions }} + {{ row.missingPortions }}
                      </div>
                    </td>
                    <td>
                      <span v-if="row.kilos" class="fw-bold" style="color: var(--color-success);">
                        {{ row.kilos.toFixed(2) }} kg
                      </span>
                      <span v-else class="fw-bold" style="color: var(--color-success);">
                        {{ row.totalGrams }} g
                      </span>
                      <span v-if="row.kilos" class="small d-block" style="color: var(--color-text-secondary);">
                        ({{ row.totalGrams }} g)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Save Button -->
          <div class="d-flex justify-content-end mt-4">
            <button type="button" class="btn btn-primary" :disabled="saving" @click="savePortions">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              <i v-else class="bi bi-check-circle me-2"></i>
              Guardar Porciones
            </button>
          </div>

          <!-- Shopping Summary -->
          <div class="card mt-4" style="border: 2px solid var(--color-primary);">
            <div class="card-header" style="background-color: var(--color-primary); color: white;">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="h6 mb-0">
                  <i class="bi bi-cart3 me-2"></i>
                  Resumen de Compras
                </h5>
                <div class="d-flex gap-2">
                  <button 
                    type="button" 
                    class="btn btn-sm" 
                    style="background-color: rgba(255,255,255,0.2); color: white; border: none;"
                    @click="copyShoppingList"
                    aria-label="Copiar lista"
                  >
                    <i class="bi bi-clipboard me-1"></i>Copiar
                  </button>
                  <button 
                    v-if="navigator && navigator.share"
                    type="button" 
                    class="btn btn-sm" 
                    style="background-color: rgba(255,255,255,0.2); color: white; border: none;"
                    @click="shareShoppingList"
                    aria-label="Compartir lista"
                  >
                    <i class="bi bi-share me-1"></i>Enviar
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="shopping-list">
                <div 
                  v-for="item in shoppingSummary" 
                  :key="item.name"
                  class="shopping-item"
                >
                  <span class="shopping-name">{{ item.name }}</span>
                  <span class="shopping-amount">
                    <span v-if="item.kilos > 0" class="fw-bold">{{ item.kilos.toFixed(1) }}kg</span>
                    <span v-else class="fw-bold">{{ item.grams }}g</span>
                    <span v-if="item.kilos > 0" class="text-muted small ms-1">({{ item.grams }}g)</span>
                  </span>
                </div>
              </div>
              <div class="mt-3 pt-3" style="border-top: 1px dashed var(--color-border);">
                <small style="color: var(--color-text-secondary);">
                  <i class="bi bi-info-circle me-1"></i>
                  Toca "Copiar" para pegar en WhatsApp u otra app
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Incomplete Bags Info -->
    <div v-if="bags.length > 0" class="card mt-4">
      <div class="card-header">
        <h5 class="h6 mb-0">
          <i class="bi bi-info-circle me-2" style="color: var(--color-info);"></i>
          Bolsas Incompletas ({{ bags.length }})
        </h5>
      </div>
      <div class="card-body">
        <p class="mb-3" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
          Las porciones faltantes se calculan automáticamente
        </p>
        
        <!-- Mobile View -->
        <div class="d-md-none">
          <div v-for="bag in bags" :key="bag._id" class="mb-3 p-3 rounded" style="background-color: var(--color-muted);">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="mb-0 fw-semibold">{{ bag.name }}</h6>
              <span class="badge" style="background-color: var(--color-text-muted); color: var(--color-text-secondary);">
                {{ bag.quantity || 1 }}
              </span>
            </div>
            <div v-if="bag.pet">
              <div class="small mb-1" style="color: var(--color-text-secondary);">{{ bag.pet.name }} - Faltantes:</div>
              <div class="d-flex flex-wrap gap-2">
                <span
                  v-for="missing in getMissingIngredientsForBag(bag)"
                  :key="missing"
                  class="badge"
                  style="background-color: var(--color-warning-bg); color: #92400E;"
                >
                  {{ missing }}
                </span>
                <span v-if="getMissingIngredientsForBag(bag).length === 0" style="color: var(--color-success); font-size: var(--font-size-sm);">
                  <i class="bi bi-check-circle me-1"></i>Completa
                </span>
              </div>
            </div>
            <div v-else style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
              Sin mascota asignada
            </div>
          </div>
        </div>

        <!-- Desktop View -->
        <div class="d-none d-md-block">
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
                  <td class="fw-semibold">{{ bag.name }}</td>
                  <td>
                    <span v-if="bag.pet">
                      <i class="bi bi-heart-fill me-1" style="color: var(--color-primary);"></i>{{ bag.pet?.name }}
                    </span>
                    <span v-else style="color: var(--color-text-muted);">Sin mascota</span>
                  </td>
                  <td>{{ bag.quantity || 1 }}</td>
                  <td>
                    <div class="d-flex flex-wrap gap-1">
                      <span
                        v-for="missing in getMissingIngredientsForBag(bag)"
                        :key="missing"
                        class="badge"
                        style="background-color: var(--color-warning-bg); color: #92400E;"
                      >
                        {{ missing }}
                      </span>
                      <span v-if="getMissingIngredientsForBag(bag).length === 0" style="color: var(--color-success);">
                        <i class="bi bi-check-circle me-1"></i>Ninguno
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shopping-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shopping-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--color-muted);
  border-radius: var(--radius-md);
}

.shopping-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.shopping-amount {
  color: var(--color-success);
  font-size: var(--font-size-base);
}
</style>

