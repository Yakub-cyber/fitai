import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { generateLimiter } from '../middleware/rateLimit'
import { User } from '../models/User'
import { Workout } from '../models/Workout'
import { generateWorkoutPlan } from '../services/ai'

export const workoutsRouter = Router()
workoutsRouter.use(requireAuth)

const generateSchema = z.object({
  targetZones: z.array(z.string()).min(1, 'Выберите хотя бы одну зону'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  durationMinutes: z.number().int().min(10).max(180).optional(),
  equipment: z.string().optional(),
})

workoutsRouter.post('/generate', generateLimiter, async (req: AuthRequest, res) => {
  const parsed = generateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

  try {
    const plan = await generateWorkoutPlan({
      ...parsed.data,
      level: parsed.data.level ?? user.fitnessLevel,
      profile: { age: user.age, weight: user.weight, height: user.height, goal: user.goal },
    })
    const workout = await Workout.create({ userId: user.id, plan })
    res.status(201).json(workout)
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ошибка генерации' })
  }
})

workoutsRouter.get('/', async (req: AuthRequest, res) => {
  const workouts = await Workout.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(workouts)
})

workoutsRouter.get('/:id', async (req: AuthRequest, res) => {
  const workout = await Workout.findOne({ _id: req.params.id, userId: req.userId })
  if (!workout) return res.status(404).json({ error: 'Тренировка не найдена' })
  res.json(workout)
})

workoutsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const result = await Workout.deleteOne({ _id: req.params.id, userId: req.userId })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Тренировка не найдена' })
  res.json({ ok: true })
})
