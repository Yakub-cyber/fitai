import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // База для GitHub Pages задаётся в CI через VITE_BASE=/<repo>/. Локально/на своём домене — '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    // Порт можно задать через PORT (preview подставляет свободный), иначе 5173
    port: Number(process.env.PORT) || 5173,
    // Все запросы /api уходят на API Gateway — фронту не нужно знать про CORS
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
