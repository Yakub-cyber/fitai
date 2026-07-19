import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// На GitHub Pages нет server-side reroute для SPA — при F5 на /workouts Pages
// отдаёт 404. Копия index.html → 404.html решает это без потери маршрута.
function pagesSpaFallback(): Plugin {
  return {
    name: 'pages-spa-404',
    apply: 'build',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      const src = resolve(dist, 'index.html')
      if (existsSync(src)) copyFileSync(src, resolve(dist, '404.html'))
    },
  }
}

export default defineConfig({
  // База для GitHub Pages задаётся в CI через VITE_BASE=/<repo>/. Локально/на своём домене — '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), pagesSpaFallback()],
  server: {
    // Порт можно задать через PORT (preview подставляет свободный), иначе 5173
    port: Number(process.env.PORT) || 5173,
    // Все запросы /api уходят на API Gateway — фронту не нужно знать про CORS
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
