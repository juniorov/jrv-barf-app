import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const apiUrl = process.env.VITE_API_URL || 'https://jrv-barf-app.onrender.com/api';
const apiDomain = new URL(apiUrl).origin;

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: new RegExp(`^${apiDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/.*`, 'i'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'BARF Food Manager',
        short_name: 'FoodBarf',
        description: 'Gestor de alimentación BARF para mascotas. Controla las porciones, ingredientes y bolsas de comida de tus mascotas.',
        theme_color: '#10B981',
        background_color: '#F8FFFE',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml'
          }
        ],
        categories: ['lifestyle', 'health', 'pets'],
        lang: 'es-ES'
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
