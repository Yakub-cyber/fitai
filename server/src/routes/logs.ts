import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { LogEntry } from '../models/LogEntry'
import { User } from '../models/User'

export const logsRouter = Router()
logsRouter.use(requireAuth)

const createSchema = z
  .object({
    type: z.enum(['weight', 'workout']),
    weight: z.number().min(20).max(400).optional(),
    workoutId: z.string().optional(),
    note: z.string().max(500).optional(),
    date: z.coerce.date().optional(),
  })
  .refine((d) => d.type !== 'weight' || d.weight !== undefined, {
    message: 'Для записи веса укажите weight',
  })

logsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }
  const entry = await LogEntry.create({ ...parsed.data, userId: req.userId })

  // Запись веса обновляет и текущий вес в профиле
  if (parsed.data.type === 'weight') {
    await User.findByIdAndUpdate(req.userId, { $set: { weight: parsed.data.weight } })
  }
  res.status(201).json(entry)
})

logsRouter.get('/', async (req: AuthRequest, res) => {
  const { type, from, to } = req.query
  const filter: Record<string, unknown> = { userId: req.userId }
  if (type === 'weight' || type === 'workout') filter.type = type
  const dateFilter: Record<string, Date> = {}
  if (typeof from === 'string' && !Number.isNaN(Date.parse(from))) dateFilter.$gte = new Date(from)
  if (typeof to === 'string' && !Number.isNaN(Date.parse(to))) dateFilter.$lte = new Date(to)
  if (Object.keys(dateFilter).length) filter.date = dateFilter

  const entries = await LogEntry.find(filter).sort({ date: -1 }).limit(200)
  res.json(entries)
})

// Сводка для дашборда: текущий вес, динамика за неделю, тренировки за неделю
logsRouter.get('/stats', async (req: AuthRequest, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [user, latestWeight, weightWeekAgo, workoutsThisWeek] = await Promise.all([
    User.findById(req.userId),
    LogEntry.findOne({ userId: req.userId, type: 'weight' }).sort({ date: -1 }),
    LogEntry.findOne({ userId: req.userId, type: 'weight', date: { $lte: weekAgo } }).sort({ date: -1 }),
    LogEntry.countDocuments({ userId: req.userId, type: 'workout', date: { $gte: weekAgo } }),
  ])

  const currentWeight = latestWeight?.weight ?? user?.weight ?? null
  const weightChangeWeek =
    latestWeight?.weight !== undefined && weightWeekAgo?.weight !== undefined
      ? Number((latestWeight.weight - weightWeekAgo.weight).toFixed(1))
      : null

  res.json({ currentWeight, weightChangeWeek, workoutsThisWeek })
})

logsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const result = await LogEntry.deleteOne({ _id: req.params.id, userId: req.userId })
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Запись не найдена' })
  res.json({ ok: true })
})
