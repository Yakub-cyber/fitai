import cors from 'cors'
import express from 'express'
import { config, mockMode } from './config'
import { generateJson } from './llm'
import { mockDiet, mockWorkout } from './mock'
import { dietSystemPrompt, dietUserPrompt, workoutSystemPrompt, workoutUserPrompt } from './prompts'
import { DietPlanSchema, DietRequestSchema, WorkoutPlanSchema, WorkoutRequestSchema } from './schemas'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: mockMode ? 'mock' : 'live', model: config.model })
})

app.post('/generate/workout', async (req, res) => {
  const parsed = WorkoutRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Некорректный запрос', details: parsed.error.issues })
  }
  try {
    const plan = mockMode
      ? mockWorkout(parsed.data)
      : await generateJson(workoutSystemPrompt, workoutUserPrompt(parsed.data), WorkoutPlanSchema)
    res.json({ plan })
  } catch (err) {
    console.error('[ai] workout generation failed:', err)
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ошибка генерации тренировки' })
  }
})

app.post('/generate/diet', async (req, res) => {
  const parsed = DietRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Некорректный запрос', details: parsed.error.issues })
  }
  try {
    const plan = mockMode
      ? mockDiet(parsed.data)
      : await generateJson(dietSystemPrompt, dietUserPrompt(parsed.data), DietPlanSchema)
    res.json({ plan })
  } catch (err) {
    console.error('[ai] diet generation failed:', err)
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ошибка генерации плана питания' })
  }
})

app.listen(config.port, () => {
  console.log(`[ai] AI-сервис запущен на http://localhost:${config.port}`)
  if (mockMode) {
    console.warn('[ai] AI_API_KEY не задан — работаю в MOCK-режиме (заглушки вместо нейросети)')
  }
})
