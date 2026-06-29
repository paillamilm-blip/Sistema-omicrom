import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Separa dependencias en chunks cacheables (mejor rendimiento en visitas
    // repetidas: el vendor no cambia entre despliegues de la app).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
