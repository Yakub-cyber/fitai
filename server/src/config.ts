import 'dotenv/config'

const DEFAULT_JWT_SECRET = 'dev-secret-change-me'

export const config = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/fitai',
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:5001',
  // Белый список origin'ов для CORS (через запятую). Пусто = разрешить всем (только для dev).
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Встроенная MongoDB без Docker/установки. Данные хранятся в embeddedDbPath.
  // Чтобы использовать внешнюю БД (например Atlas) — задай EMBEDDED_MONGO=false и MONGO_URI.
  embeddedMongo: (process.env.EMBEDDED_MONGO ?? 'true') !== 'false',
  embeddedDbPath: process.env.EMBEDDED_DB_PATH ?? './data/mongo',
}

export const isProd = config.nodeEnv === 'production'

/**
 * Проверка критичных настроек перед стартом в проде.
 * Секрет по умолчанию и открытый CORS в продакшене недопустимы.
 */
export function assertProdConfig(): void {
  if (!isProd) return
  const problems: string[] = []
  if (config.jwtSecret === DEFAULT_JWT_SECRET) {
    problems.push('JWT_SECRET использует значение по умолчанию — задайте надёжный секрет')
  }
  if (!config.allowedOrigins.length) {
    problems.push('ALLOWED_ORIGINS не задан — CORS открыт всем доменам')
  }
  if (config.embeddedMongo) {
    problems.push('EMBEDDED_MONGO=true в проде — переключитесь на внешнюю БД (Atlas)')
  }
  if (problems.length) {
    throw new Error(`Небезопасная конфигурация для продакшена:\n- ${problems.join('\n- ')}`)
  }
}
