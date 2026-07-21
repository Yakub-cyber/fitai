import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { requireBot } from '../middleware/bot'
import { User } from '../models/User'

export const telegramRouter = Router()

const LINK_CODE_TTL_MS = 10 * 60 * 1000 // 10 минут

function make6DigitCode(): string {
  // Криптостойкий 6-значный код (100000..999999)
  const n = Math.floor(Math.random() * 900000) + 100000
  return String(n)
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' })
}

/**
 * POST /api/telegram/link-code
 * Авторизованный веб-юзер запрашивает 6-значный код для связки с Telegram.
 * Код показывается юзеру в UI, юзер отправляет его боту как /link 123456.
 */
telegramRouter.post('/link-code', requireAuth, async (req: AuthRequest, res) => {
  const code = make6DigitCode()
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS)
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { telegramLinkCode: code, telegramLinkCodeExpiresAt: expiresAt } },
    { new: true },
  )
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json({ code, expiresAt: expiresAt.toISOString(), ttlSeconds: LINK_CODE_TTL_MS / 1000 })
})

const consumeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Код должен быть 6 цифр'),
  telegramId: z.number().int().positive(),
  telegramName: z.string().max(120).optional(),
})

/**
 * POST /api/telegram/consume-code  (X-Bot-Secret)
 * Бот вызывает после /link 123456 — обменивает код на связку telegramId ↔ userId.
 * Возвращает публичный профиль + JWT (чтобы бот мог ходить в API от имени юзера).
 */
telegramRouter.post('/consume-code', requireBot, async (req, res) => {
  const parsed = consumeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' })
  }
  const { code, telegramId } = parsed.data

  const user = await User.findOne({
    telegramLinkCode: code,
    telegramLinkCodeExpiresAt: { $gt: new Date() },
  })
  if (!user) return res.status(404).json({ error: 'Код не найден или просрочен' })

  // Один Telegram-аккаунт = один FitAI-аккаунт (unique-индекс на telegramId).
  const owner = await User.findOne({ telegramId })
  if (owner && owner.id !== user.id) {
    return res
      .status(409)
      .json({ error: 'Этот Telegram уже связан с другим аккаунтом FitAI' })
  }

  user.telegramId = telegramId
  user.telegramLinkCode = undefined
  user.telegramLinkCodeExpiresAt = undefined
  await user.save()

  res.json({ user, token: signToken(user.id) })
})

const fromIdSchema = z.object({ telegramId: z.number().int().positive() })

/**
 * POST /api/telegram/from-id  (X-Bot-Secret)
 * Бот получает JWT для уже связанного пользователя, чтобы дальше ходить в
 * обычные /api/workouts, /api/diets, /api/logs от его имени.
 */
telegramRouter.post('/from-id', requireBot, async (req, res) => {
  const parsed = fromIdSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'telegramId обязателен' })
  }
  const user = await User.findOne({ telegramId: parsed.data.telegramId })
  if (!user) return res.status(404).json({ error: 'Аккаунт не связан' })
  res.json({ user, token: signToken(user.id) })
})
