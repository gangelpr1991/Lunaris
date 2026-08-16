import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Antes decia ["server/**/*.js", "src/**/*.{jsx,js}"] - ese "server/"
      // era un resto de cuando este archivo era el vitest.config.js unico
      // de todo el proyecto, antes de separar backend/ y frontend/ en
      // carpetas propias. Dentro de frontend/ no existe ninguna carpeta
      // server/, asi que solo queda lo que de verdad aplica aqui.
      include: ['src/**/*.{jsx,js}'],
      exclude: ['src/main.jsx'],
    },
  },
});
