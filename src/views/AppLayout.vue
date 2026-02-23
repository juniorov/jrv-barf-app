<script setup>
import { useRouter, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const logout = () => {
  auth.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="min-vh-100 d-flex flex-column bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <RouterLink to="/app" class="navbar-brand">JRV BARF</RouterLink>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
        >
          <span class="navbar-toggler-icon" />
        </button>
        <div id="mainNavbar" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <RouterLink to="/app/dashboard" class="nav-link">Dashboard</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/app/pets" class="nav-link">Mascotas</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/app/ingredients" class="nav-link">Ingredientes</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/app/bags" class="nav-link">Bolsas incompletas</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/app/portions" class="nav-link">Porciones / Compra</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/app/config" class="nav-link">Configuración</RouterLink>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-2">
            <span class="navbar-text small text-white-50" v-if="auth.user">
              {{ auth.user.email }}
            </span>
            <button type="button" class="btn btn-outline-light btn-sm" @click="logout">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-grow-1 py-4">
      <div class="container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

