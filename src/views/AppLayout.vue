<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useRouter, useRoute, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const navbarCollapse = ref(null);

const logout = () => {
  auth.logout();
  router.push({ name: 'login' });
};

const closeNavbarMenu = () => {
  if (navbarCollapse.value) {
    if (window.bootstrap && window.bootstrap.Collapse) {
      const bsCollapse = window.bootstrap.Collapse.getInstance(navbarCollapse.value);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    } else {
      navbarCollapse.value.classList.remove('show');
      navbarCollapse.value.classList.add('collapse');
    }
  }
};

watch(route, () => {
  nextTick(() => {
    closeNavbarMenu();
  });
});

onMounted(() => {
  navbarCollapse.value = document.getElementById('mainNavbar');
});

const navItems = [
  { to: '/app/dashboard', icon: 'bi-graph-up', label: 'Dashboard' },
  { to: '/app/pets', icon: 'bi-heart', label: 'Mascotas' },
  { to: '/app/ingredients', icon: 'bi-grid', label: 'Ingredientes' },
  { to: '/app/bags', icon: 'bi-bag', label: 'Bolsas' },
  { to: '/app/portions', icon: 'bi-calculator', label: 'Porciones' },
];

const isActive = (path) => {
  return route.path === path || route.path.startsWith(path + '/');
};
</script>

<template>
  <div class="min-vh-100 d-flex flex-column" style="background-color: var(--color-background);">
    <!-- Desktop Navbar -->
    <nav class="navbar navbar-expand-md navbar-dark d-none d-md-flex" style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);">
      <div class="container">
        <RouterLink to="/app" class="navbar-brand fw-bold">JRV BARF</RouterLink>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon" />
        </button>
        <div id="mainNavbar" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item" v-for="item in navItems" :key="item.to">
              <RouterLink 
                :to="item.to" 
                class="nav-link"
                :class="{ active: isActive(item.to) }"
              >
                <i :class="['bi', item.icon, 'me-1']"></i>
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-3">
            <RouterLink to="/app/config" class="nav-link text-white-50">
              <i class="bi bi-gear"></i>
            </RouterLink>
            <span class="navbar-text small text-white-50" v-if="auth.user">
              {{ auth.user.email }}
            </span>
            <button 
              type="button" 
              class="btn btn-outline-light btn-sm" 
              @click="logout"
              aria-label="Cerrar sesión"
            >
              <i class="bi bi-box-arrow-right me-1"></i>
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Header -->
    <header class="d-md-none sticky-top" style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); z-index: var(--z-sticky);">
      <div class="d-flex justify-content-between align-items-center px-4 py-3">
        <RouterLink to="/app" class="text-white fw-bold text-decoration-none fs-5">
          JRV BARF
        </RouterLink>
        <div class="d-flex align-items-center gap-2">
          <RouterLink to="/app/config" class="text-white-50 p-2" aria-label="Configuración">
            <i class="bi bi-gear fs-5"></i>
          </RouterLink>
          <button 
            type="button" 
            class="btn btn-outline-light btn-sm p-2" 
            @click="logout"
            aria-label="Cerrar sesión"
          >
            <i class="bi bi-box-arrow-right fs-5"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow-1 main-content">
      <div class="container py-3 py-md-4">
        <RouterView />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="bottom-nav d-md-none">
      <ul class="bottom-nav-items">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink 
            :to="item.to" 
            class="bottom-nav-item"
            :class="{ active: isActive(item.to) }"
          >
            <i :class="['bi', item.icon]"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
.navbar-brand {
  font-size: var(--font-size-xl);
}

.nav-link {
  font-weight: 500;
  transition: color var(--transition-fast);
}

.nav-link.active {
  color: var(--color-primary) !important;
}

@media (max-width: 767.98px) {
  header {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}
</style>

