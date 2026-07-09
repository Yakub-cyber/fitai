/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Базовый URL API в проде, если фронт и бэкенд на разных доменах.
  // Пусто (dev/один домен) => запросы идут на относительный /api.
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
