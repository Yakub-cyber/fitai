import type { NextFunction, Request, Response } from 'express'
import { config } from '../config'

// Гейт для приватных бот-эндпоинтов (например /auth/telegram/consume-code).
// Бот шлёт заголовок X-Bot-Secret со значением BOT_SHARED_SECRET из общего .env.
// Пустой секрет в конфиге => бот-эндпоинты недоступны (безопасное значение по умолчанию).
export function requireBot(req: Request, res: Response, next: NextFunction) {
  const secret = config.botSharedSecret
  if (!secret) {
    return res.status(503).json({ error: 'Бот-интеграция не настроена (BOT_SHARED_SECRET пуст)' })
  }
  const provided = req.header('X-Bot-Secret')
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Требуется валидный X-Bot-Secret' })
  }
  next()
}
