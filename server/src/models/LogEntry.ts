import { Schema, model, Types } from 'mongoose'

export interface ILogEntry {
  userId: Types.ObjectId
  type: 'weight' | 'workout'
  date: Date
  weight?: number
  workoutId?: Types.ObjectId
  note?: string
}

const logEntrySchema = new Schema<ILogEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['weight', 'workout'], required: true },
    date: { type: Date, default: Date.now },
    weight: Number,
    workoutId: { type: Schema.Types.ObjectId, ref: 'Workout' },
    note: String,
  },
  { timestamps: true },
)

logEntrySchema.index({ userId: 1, type: 1, date: -1 })

export const LogEntry = model<ILogEntry>('LogEntry', logEntrySchema)
