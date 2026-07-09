import OpenAI from 'openai'
import type { ZodType } from 'zod'
import { config } from './config'

// OpenAI-совместимый клиент. Работает с ProxyAPI, OpenAI, DeepSeek и др. —
// провайдер задаётся через AI_BASE_URL/AI_MODEL в .env.
const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return (fenced ? fenced[1] : text).trim()
}

/**
 * Запрашивает у нейросети JSON и валидирует его схемой.
 * При невалидном ответе делает одну повторную попытку, передав модели текст ошибки.
 */
export async function generateJson<T>(
  system: string,
  user: string,
  schema: ZodType<T>,
): Promise<T> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    if (lastError) {
      messages.push({
        role: 'user',
        content: `Предыдущий ответ не прошёл валидацию: ${lastError}. Верни исправленный JSON строго по схеме.`,
      })
    }

    const completion = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    messages.push({ role: 'assistant', content: raw })

    try {
      const result = schema.safeParse(JSON.parse(extractJson(raw)))
      if (result.success) return result.data
      lastError = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
    } catch {
      lastError = 'ответ не является валидным JSON'
    }
  }

  throw new Error(`Нейросеть вернула невалидный ответ: ${lastError}`)
}
