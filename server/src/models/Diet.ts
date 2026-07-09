import { Schema, model, Types } from 'mongoose'

export interface IDiet {
  userId: Types.ObjectId
  // План приходит из AI-сервиса уже провалидированным по DietPlanSchema
  plan: Record<string, unknown>
}

const dietSchema = new Schema<IDiet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
)

export const Diet = model<IDiet>('Diet', dietSchema)
