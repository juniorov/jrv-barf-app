<template>
  <div 
    v-if="showInstallPrompt" 
    class="install-prompt position-fixed bottom-0 start-50 translate-middle-x mb-3 p-3 bg-primary text-white rounded shadow-lg"
    style="z-index: 1050; max-width: 350px;"
  >
    <div class="d-flex align-items-center justify-content-between">
      <div class="me-3">
        <i class="bi bi-download"></i>
        <small class="ms-2">Instala la app en tu dispositivo</small>
      </div>
      <div>
        <button 
          @click="installPWA" 
          class="btn btn-light btn-sm me-2"
        >
          Instalar
        </button>
        <button 
          @click="dismissPrompt" 
          class="btn btn-outline-light btn-sm"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showInstallPrompt = ref(false)
let deferredPrompt = null

onMounted(() => {
  // Escuchar el evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que Chrome 67 y anteriores muestren automaticamente el prompt
    e.preventDefault()
    // Guardar el evento para poder lanzarlo después
    deferredPrompt = e
    // Mostrar nuestro botón de instalación
    showInstallPrompt.value = true
  })
  
  // Escuchar cuando la app se instala
  window.addEventListener('appinstalled', () => {
    console.log('PWA instalada correctamente')
    showInstallPrompt.value = false
  })
})

const installPWA = async () => {
  if (!deferredPrompt) return
  
  // Mostrar el prompt de instalación
  deferredPrompt.prompt()
  
  // Esperar a que el usuario responda al prompt  
  const { outcome } = await deferredPrompt.userChoice
  
  if (outcome === 'accepted') {
    console.log('Usuario aceptó instalar la PWA')
  } else {
    console.log('Usuario rechazó instalar la PWA')
  }
  
  // Limpiar el prompt
  deferredPrompt = null
  showInstallPrompt.value = false
}

const dismissPrompt = () => {
  showInstallPrompt.value = false
  deferredPrompt = null
}
</script>

<style scoped>
.install-prompt {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>