<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();
const appVersion = '1.2.0';

const quickActions = [
  { icon: 'bi-heart', label: 'Mascotas', route: 'pets', color: 'var(--color-primary)' },
  { icon: 'bi-grid', label: 'Ingredientes', route: 'ingredients', color: 'var(--color-info)' },
  { icon: 'bi-bag', label: 'Bolsas', route: 'bags', color: 'var(--color-warning)' },
  { icon: 'bi-calculator', label: 'Porciones', route: 'portions', color: 'var(--color-success)' },
];

const getUserInitials = () => {
  if (!auth.user || !auth.user.email) return '?';
  const email = auth.user.email;
  const parts = email.split('@')[0];
  if (parts.length >= 2) {
    return parts.substring(0, 2).toUpperCase();
  }
  return parts.charAt(0).toUpperCase();
};

const goToPets = () => {
  router.push({ name: 'pets' });
};
</script>

<template>
  <div class="fade-in">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="h4 mb-1" style="color: var(--color-text-primary);">Configuración</h2>
      <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Información de la aplicación
      </p>
    </div>

    <!-- User Profile Card -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="d-flex align-items-center gap-3">
          <div 
            class="d-flex align-items-center justify-content-center"
            style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: white; font-size: 1.25rem; font-weight: 600; flex-shrink: 0;"
          >
            {{ getUserInitials() }}
          </div>
          <div class="flex-grow-1">
            <h6 class="mb-1 fw-semibold">{{ auth.user?.email || 'Usuario' }}</h6>
            <small style="color: var(--color-text-secondary);">Cuenta activa</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="h6 mb-0">
          <i class="bi bi-lightning me-2" style="color: var(--color-warning);"></i>
          Acciones Rápidas
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div v-for="action in quickActions" :key="action.route" class="col-6 col-md-3">
            <button 
              class="btn w-100 p-3"
              style="background-color: var(--color-muted); border: 1px solid var(--color-border); border-radius: var(--radius-lg);"
              @click="router.push({ name: action.route })"
            >
              <i :class="['bi', action.icon, 'fs-4 d-block mb-2']" :style="{ color: action.color }"></i>
              <span class="small fw-medium">{{ action.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- App Info -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="h6 mb-0">
          <i class="bi bi-info-circle me-2" style="color: var(--color-info);"></i>
          Información de la App
        </h5>
      </div>
      <div class="card-body">
        <div class="mb-3 pb-3" style="border-bottom: 1px solid var(--color-border);">
          <div class="small mb-1" style="color: var(--color-text-secondary);">Versión</div>
          <div class="fw-semibold">{{ appVersion }}</div>
        </div>
        <div class="mb-3 pb-3" style="border-bottom: 1px solid var(--color-border);">
          <div class="small mb-1" style="color: var(--color-text-secondary);">API</div>
          <div class="fw-semibold" style="word-break: break-all;">{{ auth.API_BASE_URL || 'Conectado' }}</div>
        </div>
        <div>
          <div class="small mb-1" style="color: var(--color-text-secondary);">PWA</div>
          <div class="fw-semibold">
            <i class="bi bi-check-circle-fill me-1" style="color: var(--color-success);"></i>
            Instalable
          </div>
        </div>
      </div>
    </div>

    <!-- Logout -->
    <button type="button" class="btn btn-outline-danger w-100" @click="auth.logout(); router.push({ name: 'login' });">
      <i class="bi bi-box-arrow-right me-2"></i>
      Cerrar Sesión
    </button>
  </div>
</template>
