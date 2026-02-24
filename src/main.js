import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import App from './App.vue';
import router from './router/index.js';

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Mostrar una notificación al usuario sobre la actualización disponible
    if (confirm('Nueva versión disponible. ¿Actualizar la aplicación?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    // Mostrar notificación de que la app está lista para uso offline
    console.log('App lista para uso offline')
  },
})

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
