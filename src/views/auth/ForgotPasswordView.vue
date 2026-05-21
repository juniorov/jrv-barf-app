<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../api/client.js';

const email = ref('');
const message = ref('');
const error = ref('');
const loading = ref(false);

const onSubmit = async () => {
  message.value = '';
  error.value = '';
  if (!email.value) {
    error.value = 'El email es obligatorio';
    return;
  }
  loading.value = true;
  try {
    const res = await api.post('/auth/forgot-password', { email: email.value });
    message.value = res.message || 'Si el email existe se enviará un enlace de recuperación';
  } catch (e) {
    error.value = e.message || 'No se pudo procesar la solicitud';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page d-flex align-items-center justify-content-center" style="min-height: 100dvh; background: linear-gradient(135deg, var(--color-background) 0%, var(--color-muted) 100%);">
    <div class="auth-card fade-in" style="width: 100%; max-width: 420px; padding: 0 var(--spacing-4);">
      <div class="card shadow-lg">
        <div class="card-body p-4 p-md-5">
          <!-- Logo/Header -->
          <div class="text-center mb-4">
            <div class="mb-3" style="width: 64px; height: 64px; margin: 0 auto; background-color: var(--color-info); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-lock text-white fs-3"></i>
            </div>
            <h1 class="h4 mb-1" style="color: var(--color-text-primary);">Recuperar Contraseña</h1>
            <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Ingresa tu correo electrónico
            </p>
          </div>

          <!-- Alerts -->
          <div v-if="message" class="alert alert-success mb-4" role="alert">
            <i class="bi bi-check-circle me-2"></i>
            {{ message }}
          </div>
          <div v-if="error" class="alert alert-danger mb-4" role="alert">
            <i class="bi bi-exclamation-circle me-2"></i>
            {{ error }}
          </div>

          <!-- Form -->
          <form @submit.prevent="onSubmit" novalidate>
            <div class="mb-4">
              <label class="form-label">Correo electrónico</label>
              <input
                v-model="email"
                type="email"
                class="form-control"
                autocomplete="email"
                required
                placeholder="tu@email.com"
              />
            </div>

            <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" />
              Enviar Enlace
            </button>
          </form>

          <!-- Link -->
          <div class="text-center pt-3" style="border-top: 1px solid var(--color-border);">
            <RouterLink to="/login" class="text-decoration-none" style="color: var(--color-primary); font-size: var(--font-size-sm); font-weight: 500;">
              <i class="bi bi-arrow-left me-1"></i>Volver a iniciar sesión
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

