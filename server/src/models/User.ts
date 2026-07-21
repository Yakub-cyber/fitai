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
  telegramId?: number
  telegramLinkCode?: string
  telegramLinkCodeExpiresAt?: Date
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
    // Telegram: числовой user id (unique+sparse — один telegram = один аккаунт).
    telegramId: { type: Number, unique: true, sparse: true, index: true },
    // Одноразовый 6-значный код для связки (генерирует веб/RN, вводит в бот).
    // Живёт короткое время (~10 мин), sparse-индекс — быстрый поиск в боте.
    telegramLinkCode: { type: String, sparse: true, index: true },
    telegramLinkCodeExpiresAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.telegramLinkCode
        delete ret.telegramLinkCodeExpiresAt
        return ret
      },
    },
  },
)

export const User = model<IUser>('User', userSchema)
