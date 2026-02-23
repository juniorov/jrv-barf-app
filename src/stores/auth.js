import { defineStore } from 'pinia';
import api from '../api/client.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('barf_token') || null,
    user: JSON.parse(localStorage.getItem('barf_user') || 'null'),
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('barf_token', token);
      localStorage.setItem('barf_user', JSON.stringify(user));
    },
    clearSession() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('barf_token');
      localStorage.removeItem('barf_user');
    },
    async register(payload) {
      this.loading = true;

      try {
        const data = await api.post('/auth/register', payload);
        this.setSession(data.token, data.user);
        return data.user;
      } finally {
        this.loading = false;
      }
    },
    async login(payload) {
      this.loading = true;
      try {
        const data = await api.post('/auth/login', payload);
        this.setSession(data.token, data.user);
        return data.user;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.clearSession();
    },
    async fetchCurrentUser() {
      if (!this.token) return null;
      const user = await api.get('/auth/me');
      this.user = user;
      localStorage.setItem('barf_user', JSON.stringify(user));
      return user;
    },
  },
});

