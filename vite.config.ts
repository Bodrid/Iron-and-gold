import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      manifest: false,
      workbox: {
        cacheId: 'iron-and-gold',
        globPatterns: ['**/*.{js,css,html,png,json,igz,webmanifest}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
  worker: { format: 'es' },
});
