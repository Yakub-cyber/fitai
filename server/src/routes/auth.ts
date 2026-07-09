import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { User } from '../models/User'

export const authRouter = Router()

const profileFields = {
  name: z.string().min(1),
  age: z.number().int().min(10).max(120).optional(),
  weight: z.number().min(20).max(400).optional(),
  height: z.number().min(100).max(250).optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goal: z.string().optional(),
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов'),
  ...profileFields,
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const updateSchema = z.object({ ...profileFields, name: profileFields.name.optional() })

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' })
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }
  const { email, password, ...profile } = parsed.data

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ email, passwordHash, ...profile })
  res.status(201).json({ token: signToken(user.id), user })
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Некорректные данные' })
  }

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() })
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Неверный email или пароль' })
  }
  res.json({ token: signToken(user.id), user })
})

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json({ user })
})

authRouter.put('/me', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }
  const user = await User.findByIdAndUpdate(req.userId, { $set: parsed.data }, { new: true })
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json({ user })
})
