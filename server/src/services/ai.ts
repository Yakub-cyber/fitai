import { config } from '../config'

// Тонкий клиент AI-микросервиса: Gateway не знает про промпты и провайдера,
// он просто пересылает параметры и получает готовый провалидированный план.

async function callAi(path: string, payload: unknown): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(`${config.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('AI-сервис недоступен. Проверьте, что он запущен (npm run dev:ai).')
  }

  const data = (await res.json().catch(() => ({}))) as { plan?: Record<string, unknown>; error?: string }
  if (!res.ok || !data.plan) {
    throw new Error(data.error ?? `AI-сервис вернул ошибку ${res.status}`)
  }
  return data.plan
}

export function generateWorkoutPlan(payload: unknown) {
  return callAi('/generate/workout', payload)
}

export function generateDietPlan(payload: unknown) {
  return callAi('/generate/diet', payload)
}
