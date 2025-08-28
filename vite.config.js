// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,          // <- permite acceder por IP desde el iPhone
    port: 5173,          // (opcional) fija puerto
    proxy: {
      '/api': {
        target: 'http://localhost:8081', // <- tu Mule local
        changeOrigin: true,
        secure: false,
        // /api/paradas  -> http://localhost:8081/paradas
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
