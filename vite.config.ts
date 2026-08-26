/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  // Configuración de Vitest (comparte el mismo config que Vite, sin bundler
  // adicional). Ver: https://vitest.dev/config/
  test: {
    environment: 'jsdom',
    globals: true,
    // No falla el CI si algún cambio temporalmente no trae archivos de test.
    passWithNoTests: true,
  },
  build: {
    // Separa dependencias en chunks cacheables (mejor rendimiento en visitas
    // repetidas: el vendor no cambia entre despliegues de la app).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Three.js ecosystem — HEAVY (~500KB) — lazy loaded via OrbNeuronal
          if (id.includes('three') || id.includes('@react-three') || id.includes('postprocessing')) return 'three';
          // Supabase client
          if (id.includes('@supabase')) return 'supabase';
          // Icons (tree-shakeable but still chunky)
          if (id.includes('lucide-react')) return 'icons';
          // React core
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler') || id.includes('react-router')) return 'react';
          // Framer Motion — included in vendor chunk to avoid TDZ issues
          // with lazy-loaded components that import it (ConvalidaOmicron, etc.)
          // Previously in its own 'motion' chunk which caused:
          // "Cannot access 'de' before initialization" on code-split boundaries.
          if (id.includes('framer-motion')) return 'vendor';
          // Zod (validation)
          if (id.includes('zod')) return 'validation';
          // Everything else
          return 'vendor';
        },
      },
    },
  },
});
