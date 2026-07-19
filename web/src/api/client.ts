import { localApi } from './local'

const TOKEN_KEY = 'fitai_token'

// Режим работы:
//  • VITE_API_URL задан  → ходим на реальный бэкенд (server на другом домене).
//  • VITE_API_URL пуст   → статичный режим: локальный «бэкенд» в браузере (localStorage).
//    Так сайт полностью работает на GitHub Pages без сервера.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET')

  // Статичный режим: без сервера, всё считает браузер.
  if (!API_BASE) {
    return localApi(path, method, options.body) as Promise<T>
  }

  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Ошибка ${res.status}`)
  }
  return res.json() as Promise<T>
}
