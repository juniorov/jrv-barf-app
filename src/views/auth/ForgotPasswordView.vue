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
  <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div class="card shadow-sm" style="min-width: 360px; max-width: 420px;">
      <div class="card-body">
        <h1 class="h5 mb-3 text-center">Recuperar contraseña</h1>

        <p class="small text-muted">
          Introduce tu correo electrónico y, si existe en el sistema, se generará un enlace de
          recuperación (en este demo se mostrará en la consola del servidor).
        </p>

        <div v-if="message" class="alert alert-success py-2">{{ message }}</div>
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

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" />
            Enviar enlace
          </button>
        </form>

        <div class="mt-3 text-center">
          <RouterLink to="/login" class="small">Volver a iniciar sesión</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

