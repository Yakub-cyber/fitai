import { Schema, model } from 'mongoose'

export interface IUser {
  email: string
  passwordHash: string
  name: string
  age?: number
  weight?: number
  height?: number
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goal: string
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    age: Number,
    weight: Number,
    height: Number,
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    goal: { type: String, default: 'Поддержание формы' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        return ret
      },
    },
  },
)

export const User = model<IUser>('User', userSchema)
