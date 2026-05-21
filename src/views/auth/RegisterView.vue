<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');

const onSubmit = async () => {
  error.value = '';
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = 'Todos los campos son obligatorios';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }
  try {
    await auth.register({ email: email.value, password: password.value });
    router.push({ name: 'ingredients' });
  } catch (e) {
    error.value = e.message || 'No se pudo registrar el usuario';
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
            <div class="mb-3" style="width: 64px; height: 64px; margin: 0 auto; background-color: var(--color-primary); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center;">
              <i class="bi bi-person-plus text-white fs-3"></i>
            </div>
            <h1 class="h4 mb-1" style="color: var(--color-text-primary);">Crear Cuenta</h1>
            <p class="mb-0" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              Únete a JRV BARF
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-danger mb-4" role="alert">
            <i class="bi bi-exclamation-circle me-2"></i>
            {{ error }}
          </div>

          <!-- Register Form -->
          <form @submit.prevent="onSubmit" novalidate>
            <div class="mb-3">
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
            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input
                v-model="password"
                type="password"
                class="form-control"
                autocomplete="new-password"
                required
                minlength="6"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div class="mb-4">
              <label class="form-label">Confirmar Contraseña</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="form-control"
                autocomplete="new-password"
                required
                minlength="6"
                placeholder="Repite tu contraseña"
              />
            </div>

            <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="auth.loading">
              <span v-if="auth.loading" class="spinner-border spinner-border-sm me-2" />
              Crear Cuenta
            </button>
          </form>

          <!-- Link -->
          <div class="text-center pt-3" style="border-top: 1px solid var(--color-border);">
            <RouterLink to="/login" class="text-decoration-none" style="color: var(--color-primary); font-size: var(--font-size-sm); font-weight: 500;">
              <i class="bi bi-arrow-left me-1"></i>¿Ya tienes cuenta? Inicia sesión
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

