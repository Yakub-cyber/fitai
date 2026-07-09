import type { DietPlan, DietRequest, WorkoutPlan, WorkoutRequest } from './schemas'

// Mock-режим: правдоподобные данные по той же схеме, что и ответ нейросети.
// Позволяет разрабатывать фронтенд и бэкенд без ключа DeepSeek.

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

const LEVEL_PARAMS = {
  beginner: { sets: 3, reps: '10-12', rest: 90, label: 'новичок' },
  intermediate: { sets: 4, reps: '12-15', rest: 60, label: 'средний уровень' },
  advanced: { sets: 4, reps: '15-20', rest: 45, label: 'продвинутый' },
} as const

export function mockWorkout(req: WorkoutRequest): WorkoutPlan {
  const params = LEVEL_PARAMS[req.level]
  const exercises = req.targetZones.flatMap((zone) => {
    const bank = EXERCISES[zone.toLowerCase()] ?? EXERCISES['пресс']
    return bank.map((e) => ({
      ...e,
      sets: params.sets,
      reps: e.name === 'Планка' ? '30-60 сек' : params.reps,
      restSeconds: params.rest,
    }))
  })

  return {
    title: `Тренировка: ${req.targetZones.join(', ')} (${params.label})`,
    level: req.level,
    targetZones: req.targetZones,
    durationMinutes: req.durationMinutes,
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

export function mockDiet(req: DietRequest): DietPlan {
  const dailyCalories = GOAL_CALORIES.find(([re]) => re.test(req.goal))?.[1] ?? 2100
  const mealNames = MEAL_NAMES.slice(0, req.mealsPerDay)
  const perMeal = Math.round(dailyCalories / mealNames.length)

  // Белки/жиры/углеводы: примерное распределение 30/30/40 от калорийности
  const protein = Math.round((dailyCalories * 0.3) / 4)
  const fat = Math.round((dailyCalories * 0.3) / 9)
  const carbs = Math.round((dailyCalories * 0.4) / 4)

  const meals = mealNames.map((name, i) => {
    const products = req.products.filter((_, idx) => idx % mealNames.length === i)
    const main = products[0] ?? req.products[0]
    return {
      name,
      recipeTitle: `Блюдо из: ${(products.length ? products : [main]).join(', ')}`,
      ingredients: (products.length ? products : [main]).map((p) => `${p} — по вкусу`),
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
    title: `План питания: ${req.goal}`,
    goal: req.goal,
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
