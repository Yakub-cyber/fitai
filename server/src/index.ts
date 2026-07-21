import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { assertProdConfig, config } from './config'
import { connectDb } from './db'
import { apiLimiter, authLimiter } from './middleware/rateLimit'
import { authRouter } from './routes/auth'
import { dietsRouter } from './routes/diets'
import { logsRouter } from './routes/logs'
import { telegramRouter } from './routes/telegram'
import { workoutsRouter } from './routes/workouts'

const app = express()

// За прокси/балансировщиком (Railway, Render, nginx) — доверяем первому хопу,
// чтобы rate-limit и req.ip работали по реальному адресу клиента.
app.set('trust proxy', 1)

app.use(helmet())
// CORS: в проде — только домены из ALLOWED_ORIGINS; если список пуст — разрешаем всем (dev).
app.use(cors({ origin: config.allowedOrigins.length ? config.allowedOrigins : true }))
// Ограничиваем размер тела запроса — защита от больших payload'ов.
app.use(express.json({ limit: '100kb' }))
app.use('/api', apiLimiter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authLimiter, authRouter)
app.use('/api/telegram', telegramRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/diets', dietsRouter)
app.use('/api/logs', logsRouter)

// Опциональная раздача собранного фронта — деплой одним сервисом (один домен,
// без CORS, относительный /api). Включается через SERVE_WEB=true.
// Требует предварительной сборки: npm run build -w web
if (process.env.SERVE_WEB === 'true') {
  const here = dirname(fileURLToPath(import.meta.url))
  const webDist = process.env.WEB_DIST_PATH
    ? resolve(process.env.WEB_DIST_PATH)
    : resolve(here, '../../web/dist')
  if (existsSync(webDist)) {
    app.use(express.static(webDist))
    // SPA-фолбэк для клиентского роутинга — всё, кроме /api, отдаёт index.html
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(resolve(webDist, 'index.html'))
    })
    console.log('[server] Раздаю статику фронта из', webDist)
  } else {
    console.warn(`[server] SERVE_WEB=true, но сборка не найдена: ${webDist} — выполните npm run build -w web`)
  }
}

// Единый обработчик непойманных ошибок — клиент всегда получает JSON
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] unhandled error:', err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  },
)

async function main() {
  assertProdConfig()
  await connectDb()
  app.listen(config.port, () => {
    console.log(`[server] API Gateway запущен на http://localhost:${config.port}`)
  })
}

main().catch((err) => {
  console.error('[server] не удалось запуститься:', err)
  process.exit(1)
})
