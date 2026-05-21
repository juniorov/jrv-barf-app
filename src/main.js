import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import App from './App.vue';
import router from './router/index.js';
import apiClient from './api/client.js';

import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Actualizar la aplicación?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App lista para uso offline')
  },
})

apiClient.setRouter(router);

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
