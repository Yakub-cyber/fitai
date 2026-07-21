import axios, { type AxiosInstance } from 'axios'
import { config } from './config.js'

// Клиент к FitAI backend. Два режима вызовов:
//  1) от имени бота (X-Bot-Secret) — /telegram/consume-code, /telegram/from-id
//  2) от имени юзера (Authorization: Bearer <jwt>) — обычные /workouts, /diets, /logs
export const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 20000,
})

export function botHeaders() {
  return { 'X-Bot-Secret': config.botSharedSecret }
}

export function userHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ─── Модели, дублируем минимум нужного ───
export interface User {
  _id: string
  email: string
  name: string
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goal: string
  telegramId?: number
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  restSeconds: number
  description: string
}

export interface WorkoutPlan {
  title: string
  level: string
  targetZones: string[]
  durationMinutes: number
  warmup: string
  exercises: Exercise[]
  cooldown: string
}

export interface WorkoutDoc {
  _id: string
  plan: WorkoutPlan
  createdAt: string
}

export interface Meal {
  name: string
  recipeTitle: string
  ingredients: string[]
  steps: string[]
  calories: number
}

export interface DietPlan {
  title: string
  goal: string
  dailyCalories: number
  macros: { protein: number; fat: number; carbs: number }
  meals: Meal[]
  tips: string[]
}

export interface DietDoc {
  _id: string
  plan: DietPlan
  createdAt: string
}

export interface Stats {
  currentWeight: number | null
  weightChangeWeek: number | null
  workoutsThisWeek: number
}
