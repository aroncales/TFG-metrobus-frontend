// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'], // para ngrok
    hmr: { clientPort: 443 },          // HMR detrás de https
    proxy: {
      '/api': {
        target: 'http://localhost:8081', // Mule
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // <-- CLAVE
      },
    },
  },
})
