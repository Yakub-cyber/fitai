import { z } from 'zod'

// ---------- Входящие запросы ----------

const ProfileSchema = z
  .object({
    age: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    goal: z.string().optional(),
  })
  .optional()

export const WorkoutRequestSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  targetZones: z.array(z.string()).min(1),
  durationMinutes: z.number().int().min(10).max(180).default(45),
  equipment: z.string().optional(),
  profile: ProfileSchema,
})

export const DietRequestSchema = z.object({
  products: z.array(z.string()).min(1),
  goal: z.string(),
  mealsPerDay: z.number().int().min(2).max(6).default(4),
  profile: ProfileSchema,
})

export type WorkoutRequest = z.infer<typeof WorkoutRequestSchema>
export type DietRequest = z.infer<typeof DietRequestSchema>

// ---------- Ответы нейросети (жёсткая валидация) ----------

export const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(1),
  reps: z.string(),
  restSeconds: z.number().int().min(0),
  description: z.string(),
})

export const WorkoutPlanSchema = z.object({
  title: z.string(),
  level: z.string(),
  targetZones: z.array(z.string()),
  durationMinutes: z.number(),
  warmup: z.string(),
  exercises: z.array(ExerciseSchema).min(1),
  cooldown: z.string(),
})

export const MealSchema = z.object({
  name: z.string(),
  recipeTitle: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  calories: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
})

export const DietPlanSchema = z.object({
  title: z.string(),
  goal: z.string(),
  dailyCalories: z.number(),
  macros: z.object({
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
  }),
  meals: z.array(MealSchema).min(2),
  tips: z.array(z.string()),
})

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>
export type DietPlan = z.infer<typeof DietPlanSchema>
