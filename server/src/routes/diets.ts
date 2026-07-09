import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { generateLimiter } from '../middleware/rateLimit'
import { Diet } from '../models/Diet'
import { User } from '../models/User'
import { generateDietPlan } from '../services/ai'

export const dietsRouter = Router()
dietsRouter.use(requireAuth)

const generateSchema = z.object({
  products: z.array(z.string().min(1)).min(1, 'Укажите хотя бы один продукт'),
  goal: z.string().min(1, 'Укажите цель'),
  mealsPerDay: z.number().int().min(2).max(6).optional(),
})

dietsRouter.post('/generate', generateLimiter, async (req: AuthRequest, res) => {
  const parsed = generateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }

  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

  try {
    const plan = await generateDietPlan({
      ...parsed.data,
      profile: { age: user.age, weight: user.weight, height: user.height, goal: user.goal },
    })
    const diet = await Diet.create({ userId: user.id, plan })
    res.status(201).json(diet)
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ошибка генерации' })
  }
})

dietsRouter.get('/', async (req: AuthRequest, res) => {
  const diets = await Diet.find({ userId: req.userId }).sort({ createdAt: -1 })
  res.json(diets)
})

dietsRouter.get('/:id', async (req: AuthRequest, res) => {
  const diet = await Diet.findOne({ _id: req.params.id, userId: req.userId })
  if (!diet) return res.status(404).json({ error: 'План питания не найден' })
  res.json(diet)
})

dietsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const result = await Diet.deleteOne({ _id: req.params.id, userId: req.userId })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'План питания не найден' })
  res.json({ ok: true })
})
