import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Configuración de las pruebas unitarias (npm test). Va aparte de vite.config.ts para no cargar
// el plugin de Power Apps: las pruebas corren en Node, sin Power Apps ni Dataverse.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
