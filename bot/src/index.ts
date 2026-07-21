import { type Context, Markup, Telegraf } from 'telegraf'
import { api, botHeaders, userHeaders, type DietDoc, type Stats, type WorkoutDoc } from './api.js'
import { config } from './config.js'
import { clearToken, getToken, setToken } from './storage.js'

const bot = new Telegraf(config.botToken)

// ───────────── Хелперы ─────────────

function keyboard() {
  return Markup.keyboard([
    ['💪 Тренировка', '🥗 Диета'],
    ['📊 Статистика', '⚖️ Записать вес'],
    ['🔗 Привязать аккаунт'],
  ]).resize()
}

function openAppButton() {
  const url = config.tmaUrl
    ? Markup.button.webApp('Открыть приложение', config.tmaUrl)
    : Markup.button.url('Открыть сайт', config.webUrl)
  return Markup.inlineKeyboard([[url]])
}

function ensureLinkedReply(): string {
  return (
    'Аккаунт FitAI не привязан к этому Telegram.\n\n' +
    '👉 Открой сайт: ' +
    config.webUrl +
    '\nЗайди в свой аккаунт → Профиль → «Привязать Telegram» → скопируй 6-значный код.\n' +
    'Пришли его сюда: /link 123456'
  )
}

async function getUserJwt(telegramId: number): Promise<string | null> {
  const cached = getToken(telegramId)
  if (cached) return cached
  // Пробуем достать по telegramId из БД (для случая когда токен потерялся, но связка есть).
  try {
    const { data } = await api.post('/api/telegram/from-id', { telegramId }, { headers: botHeaders() })
    setToken(telegramId, data.token)
    return data.token
  } catch {
    return null
  }
}

// Массивы «зон» → в бота даём короткие кнопки
const ZONES = ['Грудь', 'Спина', 'Ноги', 'Руки', 'Плечи', 'Пресс', 'Кардио']

// ───────────── Команды ─────────────

bot.start(async (ctx) => {
  await ctx.reply(
    `Привет, ${ctx.from.first_name}! Я FitAI 💪\n\n` +
      'Я помогу с тренировками и питанием.\n' +
      'Для начала — привяжи аккаунт: /link, а потом жми на кнопки внизу.',
    keyboard(),
  )
  await ctx.reply('Полное веб-приложение — по кнопке ниже:', openAppButton())
})

bot.help((ctx) =>
  ctx.reply(
    'Команды:\n' +
      '/link 123456 — привязать аккаунт по коду с сайта\n' +
      '/workout грудь пресс — сгенерировать тренировку\n' +
      '/diet курица рис — план питания по продуктам\n' +
      '/weight 78.5 — записать вес\n' +
      '/stats — сводка недели\n' +
      '/logout — отвязать этот Telegram\n' +
      '/open — открыть приложение',
    keyboard(),
  ),
)

// ─── Линковка ───
bot.command('link', async (ctx) => {
  const code = ctx.message.text.split(/\s+/)[1]?.trim()
  if (!code || !/^\d{6}$/.test(code)) {
    return ctx.reply(
      'Формат: /link 123456\n\n' +
        'Возьми код на сайте: ' +
        config.webUrl +
        ' → авторизуйся → Профиль → «Привязать Telegram».',
    )
  }
  try {
    const { data } = await api.post(
      '/api/telegram/consume-code',
      { code: code, telegramId: ctx.from.id, telegramName: ctx.from.first_name },
      { headers: botHeaders() },
    )
    setToken(ctx.from.id, data.token)
    await ctx.reply(
      `Готово! Привязал к аккаунту ${data.user.email}.\n` +
        `Профиль: ${data.user.name} · уровень ${data.user.fitnessLevel} · цель «${data.user.goal}».`,
      keyboard(),
    )
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      (err instanceof Error ? err.message : 'Не удалось привязать')
    ctx.reply(`Ошибка: ${msg}`)
  }
})

bot.command('logout', async (ctx) => {
  clearToken(ctx.from.id)
  ctx.reply('Токен удалён с бота. Связка на сервере осталась — введи новый /link 123456 когда нужно.')
})

bot.command('open', (ctx) => ctx.reply('Открыть приложение:', openAppButton()))

// ─── Тренировка ───
async function handleWorkout(ctx: Context, zonesArg: string[]) {
  if (!ctx.from) return
  const token = await getUserJwt(ctx.from.id)
  if (!token) return ctx.reply(ensureLinkedReply())

  const zones = zonesArg
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => ZONES.find((y) => y.toLowerCase().startsWith(z.toLowerCase())) ?? z)
  if (zones.length === 0) {
    return ctx.reply(
      'Укажи зоны:\n/workout грудь пресс\n\nДоступно: ' + ZONES.join(', ').toLowerCase(),
    )
  }

  await ctx.replyWithChatAction('typing')
  try {
    const { data } = await api.post<WorkoutDoc>(
      '/api/workouts/generate',
      { targetZones: zones, durationMinutes: 45 },
      { headers: userHeaders(token) },
    )
    const p = data.plan
    const lines = [
      `<b>${p.title}</b>`,
      `⏱ ~${p.durationMinutes} мин · ${p.exercises.length} упражнений`,
      '',
      `<b>Разминка</b>: ${p.warmup}`,
      '',
      ...p.exercises.map(
        (e, i) => `${i + 1}. <b>${e.name}</b>\n   ${e.sets} × ${e.reps} · отдых ${e.restSeconds}с\n   <i>${e.description}</i>`,
      ),
      '',
      `<b>Заминка</b>: ${p.cooldown}`,
    ]
    await ctx.replyWithHTML(lines.join('\n'))
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      (err instanceof Error ? err.message : 'Ошибка')
    ctx.reply(`Ошибка генерации: ${msg}`)
  }
}

bot.command('workout', (ctx) => handleWorkout(ctx, ctx.message.text.split(/\s+/).slice(1)))
bot.hears('💪 Тренировка', (ctx) =>
  ctx.reply(
    'Выбери зоны (через запятую или командой /workout):',
    Markup.inlineKeyboard(
      ZONES.map((z) => [Markup.button.callback(z, `zone:${z.toLowerCase()}`)]),
    ),
  ),
)

bot.action(/^zone:(.+)$/, async (ctx) => {
  const zone = ctx.match[1]
  await ctx.answerCbQuery('Готовлю тренировку…')
  await handleWorkout(ctx, [zone])
})

// ─── Диета ───
async function handleDiet(ctx: Context, products: string[]) {
  if (!ctx.from) return
  const token = await getUserJwt(ctx.from.id)
  if (!token) return ctx.reply(ensureLinkedReply())
  if (products.length === 0) {
    return ctx.reply('Укажи продукты:\n/diet курица рис брокколи творог')
  }
  await ctx.replyWithChatAction('typing')
  try {
    const { data } = await api.post<DietDoc>(
      '/api/diets/generate',
      { products, goal: 'Поддержание формы', mealsPerDay: 4 },
      { headers: userHeaders(token) },
    )
    const p = data.plan
    const macros = p.macros
    const lines = [
      `<b>${p.title}</b>`,
      `🎯 ${p.dailyCalories} ккал/день · Б ${macros.protein} · Ж ${macros.fat} · У ${macros.carbs}`,
      '',
      ...p.meals.map(
        (m) =>
          `<b>${m.name}: ${m.recipeTitle}</b>\n` +
          `   ${m.calories} ккал · ${m.ingredients.join(', ')}`,
      ),
      '',
      p.tips.map((t) => `💡 ${t}`).join('\n'),
    ]
    await ctx.replyWithHTML(lines.join('\n'))
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      (err instanceof Error ? err.message : 'Ошибка')
    ctx.reply(`Ошибка: ${msg}`)
  }
}

bot.command('diet', (ctx) => handleDiet(ctx, ctx.message.text.split(/\s+/).slice(1)))
bot.hears('🥗 Диета', (ctx) => ctx.reply('Пример: /diet курица рис брокколи творог'))

// ─── Вес ───
bot.command('weight', async (ctx) => {
  const token = await getUserJwt(ctx.from.id)
  if (!token) return ctx.reply(ensureLinkedReply())
  const val = Number(ctx.message.text.split(/\s+/)[1]?.replace(',', '.'))
  if (!val || val < 20 || val > 400) return ctx.reply('Пример: /weight 78.5')
  try {
    await api.post('/api/logs', { type: 'weight', weight: val }, { headers: userHeaders(token) })
    ctx.reply(`Записал: ${val} кг ✓`)
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      (err instanceof Error ? err.message : 'Ошибка')
    ctx.reply(`Ошибка: ${msg}`)
  }
})
bot.hears('⚖️ Записать вес', (ctx) => ctx.reply('Пример: /weight 78.5'))

// ─── Статистика ───
bot.command('stats', async (ctx) => {
  const token = await getUserJwt(ctx.from.id)
  if (!token) return ctx.reply(ensureLinkedReply())
  try {
    const { data } = await api.get<Stats>('/api/logs/stats', { headers: userHeaders(token) })
    const line = (label: string, val: string) => `${label}: <b>${val}</b>`
    const change =
      data.weightChangeWeek == null
        ? '—'
        : `${data.weightChangeWeek > 0 ? '+' : ''}${data.weightChangeWeek} кг`
    ctx.replyWithHTML(
      [
        '📊 Твоя неделя',
        line('Текущий вес', data.currentWeight != null ? `${data.currentWeight} кг` : '—'),
        line('Изменение', change),
        line('Тренировок', String(data.workoutsThisWeek)),
      ].join('\n'),
    )
  } catch (err) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      (err instanceof Error ? err.message : 'Ошибка')
    ctx.reply(`Ошибка: ${msg}`)
  }
})
bot.hears('📊 Статистика', (ctx) => ctx.reply('Команда: /stats'))
bot.hears('🔗 Привязать аккаунт', (ctx) => ctx.reply(ensureLinkedReply()))

// ─── Запуск (long-polling) ───
bot.catch((err) => console.error('[bot] error:', err))

bot
  .launch({ dropPendingUpdates: true })
  .then(() => console.log('[bot] запущен (long-polling), API:', config.apiUrl))
  .catch((err) => {
    console.error('[bot] не удалось запустить:', err)
    process.exit(1)
  })

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
