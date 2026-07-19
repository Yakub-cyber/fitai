// Локальный «бэкенд» в браузере — статичный режим (GitHub Pages, без сервера).
// Воспроизводит роуты API Gateway поверх localStorage. Данные живут в браузере
// пользователя. Генерация планов — порт mock-логики ai-service (офлайн, бесплатно).
//
// client.ts вызывает localApi(), когда не задан VITE_API_URL (т.е. нет отдельного бэкенда).

import type { DietDoc, DietPlan, LogEntry, Stats, User, WorkoutDoc, WorkoutPlan } from './types'

// ───────────────────────── Хранилище ─────────────────────────
const LS = window.localStorage

function read<T>(key: string, fallback: T): T {
  try {
    const raw = LS.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): void {
  LS.setItem(key, JSON.stringify(value))
}

const USERS_KEY = 'fitai_users'
const TOKEN_KEY = 'fitai_token'
const wKey = (uid: string) => `fitai_workouts_${uid}`
const dKey = (uid: string) => `fitai_diets_${uid}`
const lKey = (uid: string) => `fitai_logs_${uid}`

interface StoredUser extends User {
  passwordHash: string
  createdAt: string
}

const newId = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

async function hashPw(password: string): Promise<string> {
  const data = new TextEncoder().encode('fitai:' + password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _p, ...rest } = u
  return rest
}

function currentUser(): StoredUser {
  const token = LS.getItem(TOKEN_KEY)
  const users = read<StoredUser[]>(USERS_KEY, [])
  const u = token ? users.find((x) => x._id === token) : undefined
  if (!u) throw new Error('Требуется авторизация')
  return u
}

// ───────────────────────── Генерация (порт mock.ts) ─────────────────────────
type Level = 'beginner' | 'intermediate' | 'advanced'

const EXERCISES: Record<string, { name: string; description: string }[]> = {
  грудь: [
    { name: 'Отжимания от пола', description: 'Корпус прямой, локти под 45° к телу, опускайтесь до касания грудью пола.' },
    { name: 'Отжимания с широкой постановкой рук', description: 'Руки шире плеч, акцент на грудные мышцы, движение медленное и контролируемое.' },
  ],
  спина: [
    { name: 'Супермен', description: 'Лёжа на животе одновременно поднимайте руки и ноги, задержка 2 секунды наверху.' },
    { name: 'Тяга в наклоне (резинка/гантели)', description: 'Спина прямая, тяните локти вдоль корпуса к поясу, сводя лопатки.' },
  ],
  ноги: [
    { name: 'Приседания', description: 'Стопы на ширине плеч, колени идут за носками, таз отводится назад до параллели бёдер с полом.' },
    { name: 'Выпады на месте', description: 'Шаг вперёд, заднее колено почти касается пола, корпус вертикально.' },
  ],
  руки: [
    { name: 'Обратные отжимания от стула', description: 'Руки на краю опоры за спиной, сгибайте локти до 90°, работает трицепс.' },
    { name: 'Сгибания рук (резинка/гантели)', description: 'Локти прижаты к корпусу, поднимайте кисти к плечам без раскачивания.' },
  ],
  плечи: [
    { name: 'Отжимания уголком (пайк)', description: 'Таз поднят вверх, руки и корпус образуют треугольник, опускайте голову к полу.' },
    { name: 'Подъёмы рук через стороны', description: 'Слегка согнутые руки поднимаются до уровня плеч, без рывков.' },
  ],
  пресс: [
    { name: 'Планка', description: 'Локти под плечами, тело — прямая линия, не прогибайте поясницу.' },
    { name: 'Скручивания', description: 'Поясница прижата к полу, поднимайте лопатки за счёт мышц пресса.' },
  ],
  кардио: [
    { name: 'Джампинг Джек', description: 'Прыжки с одновременным разведением рук и ног, держите ровный темп.' },
    { name: 'Бег на месте с высоким подниманием колен', description: 'Колени до уровня пояса, активная работа рук.' },
  ],
}

const LEVEL_PARAMS: Record<Level, { sets: number; reps: string; rest: number; label: string }> = {
  beginner: { sets: 3, reps: '10-12', rest: 90, label: 'новичок' },
  intermediate: { sets: 4, reps: '12-15', rest: 60, label: 'средний уровень' },
  advanced: { sets: 4, reps: '15-20', rest: 45, label: 'продвинутый' },
}

function genWorkout(level: Level, targetZones: string[], durationMinutes: number): WorkoutPlan {
  const params = LEVEL_PARAMS[level] ?? LEVEL_PARAMS.beginner
  const exercises = targetZones.flatMap((zone) => {
    const bank = EXERCISES[zone.toLowerCase()] ?? EXERCISES['пресс']
    return bank.map((e) => ({
      ...e,
      sets: params.sets,
      reps: e.name === 'Планка' ? '30-60 сек' : params.reps,
      restSeconds: params.rest,
    }))
  })
  return {
    title: `Тренировка: ${targetZones.join(', ')} (${params.label})`,
    level,
    targetZones,
    durationMinutes,
    warmup: '5-7 минут: суставная разминка сверху вниз, лёгкое кардио на месте, динамическая растяжка целевых зон.',
    exercises,
    cooldown: '5 минут: статическая растяжка проработанных мышц, восстановление дыхания.',
  }
}

const MEAL_NAMES = ['Завтрак', 'Обед', 'Ужин', 'Перекус', 'Второй завтрак', 'Полдник']
const GOAL_CALORIES: [RegExp, number][] = [
  [/похуд|сниж|дефицит/i, 1700],
  [/набор|масс|профицит/i, 2700],
]

function genDiet(products: string[], goal: string, mealsPerDay: number): DietPlan {
  const dailyCalories = GOAL_CALORIES.find(([re]) => re.test(goal))?.[1] ?? 2100
  const mealNames = MEAL_NAMES.slice(0, mealsPerDay)
  const perMeal = Math.round(dailyCalories / mealNames.length)
  const protein = Math.round((dailyCalories * 0.3) / 4)
  const fat = Math.round((dailyCalories * 0.3) / 9)
  const carbs = Math.round((dailyCalories * 0.4) / 4)

  const meals = mealNames.map((name, i) => {
    const picked = products.filter((_, idx) => idx % mealNames.length === i)
    const main = picked[0] ?? products[0]
    const used = picked.length ? picked : [main]
    return {
      name,
      recipeTitle: `Блюдо из: ${used.join(', ')}`,
      ingredients: used.map((p) => `${p} — по вкусу`),
      steps: [
        'Подготовьте и промойте ингредиенты.',
        'Приготовьте основным способом: варка, запекание или жарка без масла.',
        'Добавьте специи, подавайте тёплым.',
      ],
      calories: perMeal,
      protein: Math.round(protein / mealNames.length),
      fat: Math.round(fat / mealNames.length),
      carbs: Math.round(carbs / mealNames.length),
    }
  })

  return {
    title: `План питания: ${goal}`,
    goal,
    dailyCalories,
    macros: { protein, fat, carbs },
    meals,
    tips: [
      'Пейте 1,5-2 литра воды в день.',
      'Старайтесь есть в одно и то же время.',
      'Последний приём пищи — за 2-3 часа до сна.',
    ],
  }
}

// ───────────────────────── Роутер ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any

export async function localApi(path: string, method: string, body: Body): Promise<unknown> {
  const [rawPath, query] = path.split('?')
  const p = rawPath.split('/').filter(Boolean) // ['workouts','generate']

  // ── auth ──
  if (p[0] === 'auth') {
    if (p[1] === 'register' && method === 'POST') {
      const email = String(body?.email ?? '').toLowerCase().trim()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Некорректный email')
      if (!body?.password || String(body.password).length < 6)
        throw new Error('Пароль должен быть не короче 6 символов')
      if (!body?.name) throw new Error('Укажите имя')
      const users = read<StoredUser[]>(USERS_KEY, [])
      if (users.some((u) => u.email === email))
        throw new Error('Пользователь с таким email уже существует')
      const user: StoredUser = {
        _id: newId(),
        email,
        name: String(body.name),
        passwordHash: await hashPw(String(body.password)),
        age: body.age,
        weight: body.weight,
        height: body.height,
        fitnessLevel: body.fitnessLevel ?? 'beginner',
        goal: body.goal ?? 'Поддержание формы',
        createdAt: nowIso(),
      }
      users.push(user)
      write(USERS_KEY, users)
      return { token: user._id, user: publicUser(user) }
    }

    if (p[1] === 'login' && method === 'POST') {
      const email = String(body?.email ?? '').toLowerCase().trim()
      const users = read<StoredUser[]>(USERS_KEY, [])
      const u = users.find((x) => x.email === email)
      if (!u || u.passwordHash !== (await hashPw(String(body?.password ?? ''))))
        throw new Error('Неверный email или пароль')
      return { token: u._id, user: publicUser(u) }
    }

    if (p[1] === 'me') {
      const u = currentUser()
      if (method === 'PUT') {
        const users = read<StoredUser[]>(USERS_KEY, [])
        const idx = users.findIndex((x) => x._id === u._id)
        const { email: _e, passwordHash: _ph, _id: _i, ...patch } = body ?? {}
        users[idx] = { ...users[idx], ...patch }
        write(USERS_KEY, users)
        return { user: publicUser(users[idx]) }
      }
      return { user: publicUser(u) }
    }
  }

  // ── workouts ──
  if (p[0] === 'workouts') {
    const u = currentUser()
    const key = wKey(u._id)
    if (p[1] === 'generate' && method === 'POST') {
      const level: Level = (body?.level as Level) ?? u.fitnessLevel ?? 'beginner'
      const plan = genWorkout(level, body?.targetZones ?? [], body?.durationMinutes ?? 45)
      const doc: WorkoutDoc = { _id: newId(), plan, createdAt: nowIso() }
      const list = read<WorkoutDoc[]>(key, [])
      list.unshift(doc)
      write(key, list)
      return doc
    }
    if (p[1] && method === 'DELETE') {
      write(key, read<WorkoutDoc[]>(key, []).filter((x) => x._id !== p[1]))
      return { ok: true }
    }
    return read<WorkoutDoc[]>(key, [])
  }

  // ── diets ──
  if (p[0] === 'diets') {
    const u = currentUser()
    const key = dKey(u._id)
    if (p[1] === 'generate' && method === 'POST') {
      const plan = genDiet(body?.products ?? [], String(body?.goal ?? 'Поддержание формы'), body?.mealsPerDay ?? 4)
      const doc: DietDoc = { _id: newId(), plan, createdAt: nowIso() }
      const list = read<DietDoc[]>(key, [])
      list.unshift(doc)
      write(key, list)
      return doc
    }
    if (p[1] && method === 'DELETE') {
      write(key, read<DietDoc[]>(key, []).filter((x) => x._id !== p[1]))
      return { ok: true }
    }
    return read<DietDoc[]>(key, [])
  }

  // ── logs ──
  if (p[0] === 'logs') {
    const u = currentUser()
    const key = lKey(u._id)

    if (p[1] === 'stats') {
      const logs = read<LogEntry[]>(key, [])
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const weights = logs
        .filter((l) => l.type === 'weight')
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      const latest = weights[0]
      const prior = weights.find((l) => +new Date(l.date) <= weekAgo)
      const currentWeight = latest?.weight ?? u.weight ?? null
      const weightChangeWeek =
        latest?.weight != null && prior?.weight != null
          ? Number((latest.weight - prior.weight).toFixed(1))
          : null
      const workoutsThisWeek = logs.filter(
        (l) => l.type === 'workout' && +new Date(l.date) >= weekAgo,
      ).length
      return { currentWeight, weightChangeWeek, workoutsThisWeek } as Stats
    }

    if (p[1] && method === 'DELETE') {
      write(key, read<LogEntry[]>(key, []).filter((x) => x._id !== p[1]))
      return { ok: true }
    }

    if (method === 'POST') {
      if (body?.type === 'weight' && body?.weight == null)
        throw new Error('Для записи веса укажите weight')
      const entry: LogEntry = {
        _id: newId(),
        type: body.type,
        date: body.date ?? nowIso(),
        weight: body.weight,
        workoutId: body.workoutId,
        note: body.note,
      }
      const list = read<LogEntry[]>(key, [])
      list.unshift(entry)
      write(key, list)
      if (body.type === 'weight' && body.weight != null) {
        const users = read<StoredUser[]>(USERS_KEY, [])
        const idx = users.findIndex((x) => x._id === u._id)
        if (idx >= 0) {
          users[idx].weight = body.weight
          write(USERS_KEY, users)
        }
      }
      return entry
    }

    // GET (с опциональным ?type=weight|workout)
    const type = new URLSearchParams(query ?? '').get('type')
    let list = read<LogEntry[]>(key, [])
    if (type === 'weight' || type === 'workout') list = list.filter((l) => l.type === type)
    return list.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 200)
  }

  throw new Error(`Локальный API: маршрут не найден (${method} ${path})`)
}
