<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');

const onSubmit = async () => {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Email y contraseña son obligatorios';
    return;
  }
  try {
    await auth.login({ email: email.value, password: password.value });
    router.push({ name: 'ingredients' });
  } catch (e) {
    error.value = e.message || 'No se pudo iniciar sesión';
  }
};
</script>

<template>
  <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div class="card shadow-sm" style="min-width: 360px; max-width: 420px;">
      <div class="card-body">
        <h1 class="h4 mb-3 text-center">JRV BARF - Iniciar sesión</h1>

        <p class="text-muted small text-center mb-4">
          Gestiona ingredientes, bolsas y compras para tu dieta BARF.
        </p>

        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

        <form @submit.prevent="onSubmit" novalidate>
          <div class="mb-3">
            <label class="form-label">Correo electrónico</label>
            <input
              v-model="email"
              type="email"
              class="form-control"
              autocomplete="email"
              required
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Contraseña</label>
            <input
              v-model="password"
              type="password"
              class="form-control"
              autocomplete="current-password"
              required
              minlength="6"
            />
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="auth.loading">
            <span v-if="auth.loading" class="spinner-border spinner-border-sm me-2" />
            Entrar
          </button>
        </form>

        <div class="mt-3 d-flex justify-content-between">
          <RouterLink to="/register" class="small">Crear cuenta</RouterLink>
          <RouterLink to="/forgot-password" class="small">¿Olvidaste tu contraseña?</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

