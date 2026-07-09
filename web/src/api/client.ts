const TOKEN_KEY = 'fitai_token'

// В проде, если фронт и API на разных доменах — задать VITE_API_URL (без слэша на конце).
// Пусто => относительный /api (dev через Vite-прокси или один домен в проде).
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
  const token = getToken()
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
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
