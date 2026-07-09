export interface User {
  _id: string
  email: string
  name: string
  age?: number
  weight?: number
  height?: number
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goal: string
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
  protein: number
  fat: number
  carbs: number
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

export interface LogEntry {
  _id: string
  type: 'weight' | 'workout'
  date: string
  weight?: number
  workoutId?: string
  note?: string
}
