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
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Configuración</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Configuración de la aplicación
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border mb-3" role="status" style="color: var(--color-primary);"></div>
      <p style="color: var(--color-text-secondary);">Cargando...</p>
    </div>

    <!-- Content -->
    <div v-else>
      <div v-if="error" class="alert alert-danger mb-3">{{ error }}</div>

      <div class="row g-4">
        <!-- Main Info -->
        <div class="col-12 col-md-8">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-heart me-2" style="color: var(--color-primary);"></i>
                Configuración por Mascota
              </h5>
            </div>
            <div class="card-body">
              <p class="mb-3" style="color: var(--color-text-secondary);">
                Las configuraciones específicas como el <strong>máximo de ingredientes por bolsa</strong> 
                ahora se configuran individualmente para cada mascota.
              </p>
              
              <div class="p-3 rounded mb-3" style="background-color: var(--color-info-bg);">
                <div class="d-flex align-items-start">
                  <i class="bi bi-lightbulb me-2 fs-5" style="color: var(--color-info);"></i>
                  <div>
                    <strong>¿Por qué este cambio?</strong><br>
                    <span style="color: var(--color-text-secondary);">
                      Cada mascota puede tener necesidades dietéticas diferentes.
                    </span>
                  </div>
                </div>
              </div>

              <button type="button" class="btn btn-primary w-100" @click="goToPets">
                <i class="bi bi-arrow-right me-1"></i>
                Ir a Mascotas
              </button>
            </div>
          </div>
        </div>

        <!-- Default Values -->
        <div class="col-12 col-md-4">
          <div class="card">
            <div class="card-header">
              <h6 class="card-title mb-0">
                <i class="bi bi-gear me-2" style="color: var(--color-text-secondary);"></i>
                Valores por Defecto
              </h6>
            </div>
            <div class="card-body">
              <div class="mb-3 pb-3" style="border-bottom: 1px solid var(--color-border);">
                <div class="small mb-1" style="color: var(--color-text-secondary);">Máx. ingredientes</div>
                <div class="fw-bold fs-5">{{ systemInfo.defaultMaxIngredients || 5 }} por bolsa</div>
              </div>
              <div class="mb-3 pb-3" style="border-bottom: 1px solid var(--color-border);">
                <div class="small mb-1" style="color: var(--color-text-secondary);">Comidas diarias</div>
                <div class="fw-bold fs-5">1 por día</div>
              </div>
              <div>
                <div class="small mb-1" style="color: var(--color-text-secondary);">Horarios</div>
                <div class="fw-bold fs-5">Flexibles</div>
              </div>
              <hr>
              <small style="color: var(--color-text-secondary);">
                Valores asignados automáticamente al crear una nueva mascota
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

