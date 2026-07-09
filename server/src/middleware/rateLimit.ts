import rateLimit from 'express-rate-limit'

// Общий лимитер на весь API — грубая защита от флуда.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
})

// Строгий лимитер для auth — защита от перебора паролей.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
})

// Лимитер на генерацию — защищает бюджет AI-провайдера от злоупотреблений.
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Достигнут лимит генераций на час. Попробуйте позже.' },
})
