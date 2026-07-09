import { Schema, model, Types } from 'mongoose'

export interface IWorkout {
  userId: Types.ObjectId
  // План приходит из AI-сервиса уже провалидированным по WorkoutPlanSchema
  plan: Record<string, unknown>
}

const workoutSchema = new Schema<IWorkout>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
)

export const Workout = model<IWorkout>('Workout', workoutSchema)
