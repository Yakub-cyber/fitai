import 'dotenv/config'

export const config = {
  port: Number(process.env.AI_PORT ?? 5001),
  // Провайдер-агностично: любой OpenAI-совместимый эндпоинт (ProxyAPI, OpenAI, DeepSeek…).
  // DEEPSEEK_* оставлены как запасной вариант для обратной совместимости.
  apiKey: process.env.AI_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: process.env.AI_BASE_URL ?? process.env.DEEPSEEK_BASE_URL ?? 'https://api.proxyapi.ru/openai/v1',
  model: process.env.AI_MODEL ?? 'gpt-4o-mini',
}

// Без ключа сервис отдаёт правдоподобные заглушки по той же JSON-схеме —
// весь остальной стек можно разрабатывать и тестировать бесплатно.
export const mockMode = config.apiKey === ''
