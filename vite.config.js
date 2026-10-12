import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1': {
        target: 'https://api.nexxosolutions.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // El pool de procesos (forks, el default) no llega a levantar el worker
    // dentro del timeout sobre OneDrive en Windows. Con hilos arranca normal.
    pool: 'threads',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/utils/**', 'src/pages/**'],
      // Umbral de sentencias que exige la cátedra (sección 6.1 de la tesis);
      // solo se gatea esa métrica, no ramas/funciones, para no acoplar el CI
      // a cifras que el documento no declara como meta.
      thresholds: {
        statements: 85,
      },
    },
  },
})
