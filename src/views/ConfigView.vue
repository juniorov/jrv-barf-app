<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';

const router = useRouter();
const systemInfo = ref({});
const error = ref('');
const loading = ref(false);

const loadSystemInfo = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('/config/settings');
    systemInfo.value = res;
  } catch (e) {
    error.value = e.message || 'No se pudo cargar la información del sistema';
  } finally {
    loading.value = false;
  }
};

const goToPets = () => {
  router.push({ name: 'pets' });
};

onMounted(loadSystemInfo);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Configuración de la aplicación</h2>
    </div>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>

    <div v-else>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

      <div class="row">
        <!-- Información del sistema -->
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-info-circle me-2"></i>
                Configuración por Mascota
              </h5>
            </div>
            <div class="card-body">
              <p class="mb-3">
                Las configuraciones específicas como el <strong>máximo de ingredientes por bolsa</strong> 
                ahora se configuran individualmente para cada mascota, permitiendo dietas personalizadas.
              </p>
              
              <div class="alert alert-info d-flex align-items-center" role="alert">
                <i class="bi bi-lightbulb me-2"></i>
                <div>
                  <strong>¿Por qué este cambio?</strong><br>
                  Cada mascota puede tener necesidades dietéticas diferentes. Una mascota grande 
                  puede necesitar más ingredientes por bolsa que una pequeña.
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <div>
                  <h6 class="mb-1">Gestionar Configuraciones por Mascota</h6>
                  <small class="text-muted">
                    Configura el máximo de ingredientes, comidas diarias y horarios para cada mascota
                  </small>
                </div>
                <button type="button" class="btn btn-primary" @click="goToPets">
                  <i class="bi bi-arrow-right me-1"></i>
                  Ir a Mascotas
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h6 class="card-title mb-0">
                <i class="bi bi-gear me-2"></i>
                Valores por Defecto
              </h6>
            </div>
            <div class="card-body">
              <ul class="list-unstyled mb-0">
                <li class="mb-2">
                  <strong>Máx. ingredientes:</strong> {{ systemInfo.defaultMaxIngredients || 5 }} por bolsa
                </li>
                <li class="mb-2">
                  <strong>Comidas diarias:</strong> 1 por día
                </li>
                <li>
                  <strong>Horarios:</strong> Flexibles
                </li>
              </ul>
              <hr>
              <small class="text-muted">
                Estos son los valores que se asignan automáticamente al crear una nueva mascota.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

