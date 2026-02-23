import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const LoginView = () => import('../views/auth/LoginView.vue');
const RegisterView = () => import('../views/auth/RegisterView.vue');
const ForgotPasswordView = () => import('../views/auth/ForgotPasswordView.vue');
const AppLayout = () => import('../views/AppLayout.vue');
const IngredientsView = () => import('../views/IngredientsView.vue');
const BagsView = () => import('../views/BagsView.vue');
const PortionsView = () => import('../views/PortionsView.vue');
const ConfigView = () => import('../views/ConfigView.vue');
const PetsView = () => import('../views/PetsView.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { guestOnly: true },
    },
    {
      path: '/app',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'ingredients' },
        },
        {
          path: 'ingredients',
          name: 'ingredients',
          component: IngredientsView,
        },
        {
          path: 'bags',
          name: 'bags',
          component: BagsView,
        },
        {
          path: 'pets',
          name: 'pets',
          component: PetsView,
        },
        {
          path: 'portions',
          name: 'portions',
          component: PortionsView,
        },
        {
          path: 'config',
          name: 'config',
          component: ConfigView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (!auth.user && auth.token) {
    try {
      await auth.fetchCurrentUser();
    } catch {
      auth.clearSession();
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next({ name: 'ingredients' });
  }

  return next();
});

export default router;

